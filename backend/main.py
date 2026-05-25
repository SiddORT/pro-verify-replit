import os
import io
import re
import datetime as dt
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import bcrypt
from jose import jwt, JWTError
from openpyxl import load_workbook

DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ.get("SESSION_SECRET")
if not SECRET_KEY:
    raise RuntimeError("SESSION_SECRET environment variable is required")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8")[:72], h.encode("utf-8"))
    except Exception:
        return False

app = FastAPI(title="PROverify API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_admin():
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT id FROM admins WHERE email=:e"), {"e": "admin@proverify.com"}).first()
        if not row:
            db.execute(
                text("INSERT INTO admins (email, password_hash) VALUES (:e,:p)"),
                {"e": "admin@proverify.com", "p": hash_password("admin123")},
            )
            db.commit()
    finally:
        db.close()


seed_admin()


def create_token(email: str) -> str:
    payload = {"sub": email, "exp": dt.datetime.utcnow() + dt.timedelta(hours=TOKEN_EXPIRE_HOURS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def current_admin(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    row = db.execute(text("SELECT id, email FROM admins WHERE email=:e"), {"e": email}).first()
    if not row:
        raise HTTPException(status_code=401, detail="Admin not found")
    return {"id": row[0], "email": row[1]}


# ---------- Schemas ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BrandIn(BaseModel):
    name: str
    primary_color: Optional[str] = "#1b5e20"
    desktop_image: Optional[str] = None
    mobile_image: Optional[str] = None
    is_active: Optional[bool] = True


# ---------- Auth ----------
@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    row = db.execute(text("SELECT id, email, password_hash FROM admins WHERE email=:e"), {"e": data.email}).first()
    if not row or not verify_password(data.password, row[2]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(row[1])
    return {"access_token": token, "token_type": "bearer", "email": row[1]}


@app.get("/api/auth/me")
def me(admin=Depends(current_admin)):
    return admin


# ---------- Helpers ----------
def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return s or "brand"


def unique_slug(db: Session, base: str, ignore_id: Optional[int] = None) -> str:
    slug = base
    i = 2
    while True:
        q = "SELECT id FROM brands WHERE slug=:s"
        params = {"s": slug}
        if ignore_id:
            q += " AND id<>:i"
            params["i"] = ignore_id
        if not db.execute(text(q), params).first():
            return slug
        slug = f"{base}-{i}"
        i += 1


# ---------- Brands ----------
@app.get("/api/brands")
def list_brands(active_only: bool = False, db: Session = Depends(get_db), admin=Depends(current_admin)):
    q = "SELECT id, name, slug, primary_color, desktop_image, mobile_image, is_active, created_at, updated_at FROM brands"
    if active_only:
        q += " WHERE is_active=TRUE"
    q += " ORDER BY id ASC"
    rows = db.execute(text(q)).all()
    return [
        {
            "id": r[0], "name": r[1], "slug": r[2], "primary_color": r[3],
            "desktop_image": r[4], "mobile_image": r[5], "is_active": r[6],
            "created_at": r[7].isoformat() if r[7] else None,
            "updated_at": r[8].isoformat() if r[8] else None,
        } for r in rows
    ]


@app.post("/api/brands")
def create_brand(data: BrandIn, db: Session = Depends(get_db), admin=Depends(current_admin)):
    slug = unique_slug(db, slugify(data.name))
    row = db.execute(
        text("""INSERT INTO brands (name, slug, primary_color, desktop_image, mobile_image, is_active)
                VALUES (:n,:s,:c,:d,:m,:a) RETURNING id"""),
        {"n": data.name, "s": slug, "c": data.primary_color, "d": data.desktop_image,
         "m": data.mobile_image, "a": data.is_active},
    ).first()
    db.commit()
    return {"id": row[0], "slug": slug}


@app.put("/api/brands/{brand_id}")
def update_brand(brand_id: int, data: BrandIn, db: Session = Depends(get_db), admin=Depends(current_admin)):
    existing = db.execute(text("SELECT id FROM brands WHERE id=:i"), {"i": brand_id}).first()
    if not existing:
        raise HTTPException(404, "Brand not found")
    slug = unique_slug(db, slugify(data.name), ignore_id=brand_id)
    db.execute(
        text("""UPDATE brands SET name=:n, slug=:s, primary_color=:c, desktop_image=:d,
                mobile_image=:m, is_active=:a, updated_at=NOW() WHERE id=:i"""),
        {"n": data.name, "s": slug, "c": data.primary_color, "d": data.desktop_image,
         "m": data.mobile_image, "a": data.is_active, "i": brand_id},
    )
    db.commit()
    return {"ok": True}


@app.patch("/api/brands/{brand_id}/toggle")
def toggle_brand(brand_id: int, db: Session = Depends(get_db), admin=Depends(current_admin)):
    db.execute(text("UPDATE brands SET is_active = NOT is_active, updated_at=NOW() WHERE id=:i"), {"i": brand_id})
    db.commit()
    return {"ok": True}


@app.delete("/api/brands/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_db), admin=Depends(current_admin)):
    db.execute(text("DELETE FROM brands WHERE id=:i"), {"i": brand_id})
    db.commit()
    return {"ok": True}


# ---------- Codes Upload (streaming + batched insert) ----------
@app.post("/api/codes/upload")
async def upload_codes(
    brand_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(current_admin),
):
    brand = db.execute(text("SELECT id, slug FROM brands WHERE id=:i AND is_active=TRUE"), {"i": brand_id}).first()
    if not brand:
        raise HTTPException(400, "Brand not found or inactive")

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files allowed")

    # Stream upload to a temp file so we don't hold the whole xlsx in memory.
    import tempfile, shutil, os as _os
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    tmp_path = tmp.name
    batch_id = None
    try:
        try:
            shutil.copyfileobj(file.file, tmp, length=1024 * 1024)
        finally:
            tmp.close()

        try:
            wb = load_workbook(filename=tmp_path, read_only=True, data_only=True)
        except Exception as e:
            raise HTTPException(400, f"Could not read xlsx: {e}")
        ws = wb.active

        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), None)
        if not header_row:
            raise HTTPException(400, "Empty file")
        code_idx = None
        for i, h in enumerate(header_row):
            if h and str(h).strip().lower() == "code":
                code_idx = i
                break
        if code_idx is None:
            raise HTTPException(400, 'Excel must have a "Code" column header')

        # Create batch row
        today = dt.datetime.utcnow().strftime("%Y%m%d")
        count_today = db.execute(
            text("SELECT COUNT(*) FROM upload_batches WHERE brand_id=:b AND DATE(created_at)=CURRENT_DATE"),
            {"b": brand_id},
        ).scalar()
        batch_number = f"{brand[1].upper()}-{today}-{int(count_today)+1:04d}"
        batch_row = db.execute(
            text("""INSERT INTO upload_batches (brand_id, batch_number, file_name, codes_uploaded)
                    VALUES (:b,:n,:f,0) RETURNING id"""),
            {"b": brand_id, "n": batch_number, "f": file.filename},
        ).first()
        batch_id = batch_row[0]
        db.commit()

        # Streaming batched insert
        CHUNK = 5000
        chunk: List[tuple] = []
        total = 0
        conn = engine.raw_connection()
        try:
            try:
                cur = conn.cursor()
                sql = "INSERT INTO product_codes (code, brand_id, batch_id) VALUES (%s, %s, %s)"
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if not row or code_idx >= len(row):
                        continue
                    val = row[code_idx]
                    if val is None:
                        continue
                    code = str(val).strip()
                    if not code:
                        continue
                    chunk.append((code, brand_id, batch_id))
                    if len(chunk) >= CHUNK:
                        cur.executemany(sql, chunk)
                        total += len(chunk)
                        chunk = []
                if chunk:
                    cur.executemany(sql, chunk)
                    total += len(chunk)
                conn.commit()
                cur.close()
            except Exception:
                conn.rollback()
                raise
        finally:
            conn.close()

        db.execute(text("UPDATE upload_batches SET codes_uploaded=:c WHERE id=:i"), {"c": total, "i": batch_id})
        db.commit()
        return {"batch_id": batch_id, "batch_number": batch_number, "codes_uploaded": total}

    except HTTPException:
        if batch_id is not None:
            try:
                db.execute(text("DELETE FROM upload_batches WHERE id=:i"), {"i": batch_id})
                db.commit()
            except Exception:
                db.rollback()
        raise
    except Exception as e:
        if batch_id is not None:
            try:
                db.execute(text("DELETE FROM upload_batches WHERE id=:i"), {"i": batch_id})
                db.commit()
            except Exception:
                db.rollback()
        raise HTTPException(500, f"Upload failed: {e}")
    finally:
        try:
            _os.unlink(tmp_path)
        except Exception:
            pass


@app.get("/api/codes/sample")
def codes_sample():
    """Return a tiny sample .xlsx with a Code column."""
    from openpyxl import Workbook
    from fastapi.responses import StreamingResponse
    wb = Workbook()
    ws = wb.active
    ws.title = "Codes"
    ws.append(["Code"])
    for i in range(1, 11):
        ws.append([f"SAMPLE-{i:04d}"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="sample_codes.xlsx"'},
    )


# ---------- Batches & Codes listing ----------
@app.get("/api/batches")
def list_batches(db: Session = Depends(get_db), admin=Depends(current_admin)):
    rows = db.execute(text("""
        SELECT b.id, b.batch_number, b.file_name, b.codes_uploaded, b.created_at,
               br.id, br.name
        FROM upload_batches b
        JOIN brands br ON br.id=b.brand_id
        ORDER BY b.created_at DESC
    """)).all()
    return [
        {
            "id": r[0], "batch_number": r[1], "file_name": r[2],
            "codes_uploaded": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
            "brand_id": r[5], "brand_name": r[6],
        } for r in rows
    ]


@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), admin=Depends(current_admin)):
    db.execute(text("DELETE FROM upload_batches WHERE id=:i"), {"i": batch_id})
    db.commit()
    return {"ok": True}


@app.get("/api/codes")
def list_codes(
    brand_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin=Depends(current_admin),
):
    limit = min(max(limit, 1), 500)
    where = ["1=1"]
    params = {}
    if brand_id:
        where.append("pc.brand_id=:b"); params["b"] = brand_id
    if batch_id:
        where.append("pc.batch_id=:bt"); params["bt"] = batch_id
    if search:
        where.append("pc.code ILIKE :s"); params["s"] = f"%{search}%"
    w = " AND ".join(where)
    total = db.execute(text(f"SELECT COUNT(*) FROM product_codes pc WHERE {w}"), params).scalar()
    params["lim"] = limit; params["off"] = offset
    rows = db.execute(text(f"""
        SELECT pc.id, pc.code, pc.created_at, br.name
        FROM product_codes pc JOIN brands br ON br.id=pc.brand_id
        WHERE {w}
        ORDER BY pc.id DESC LIMIT :lim OFFSET :off
    """), params).all()
    return {
        "total": int(total or 0),
        "items": [
            {"id": r[0], "code": r[1], "created_at": r[2].isoformat() if r[2] else None, "brand_name": r[3]}
            for r in rows
        ],
    }


# ---------- Dashboard ----------
@app.get("/api/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db), admin=Depends(current_admin)):
    total_codes = db.execute(text("SELECT COUNT(*) FROM product_codes")).scalar() or 0
    total_verifs = db.execute(text("SELECT COUNT(*) FROM verification_logs")).scalar() or 0
    total_batches = db.execute(text("SELECT COUNT(*) FROM upload_batches")).scalar() or 0
    total_brands = db.execute(text("SELECT COUNT(*) FROM brands")).scalar() or 0

    codes_per_brand = db.execute(text("""
        SELECT br.id, br.name, COUNT(pc.id)
        FROM brands br LEFT JOIN product_codes pc ON pc.brand_id=br.id
        GROUP BY br.id, br.name ORDER BY br.id
    """)).all()
    verifs_per_brand = db.execute(text("""
        SELECT br.id, br.name, COUNT(v.id)
        FROM brands br LEFT JOIN verification_logs v ON v.brand_id=br.id
        GROUP BY br.id, br.name ORDER BY br.id
    """)).all()
    return {
        "totals": {
            "codes": int(total_codes), "verifications": int(total_verifs),
            "batches": int(total_batches), "brands": int(total_brands),
        },
        "codes_per_brand": [{"brand": r[1], "count": int(r[2])} for r in codes_per_brand],
        "verifications_per_brand": [{"brand": r[1], "count": int(r[2])} for r in verifs_per_brand],
    }


@app.get("/")
def root():
    return {"service": "PROverify API", "status": "ok"}
