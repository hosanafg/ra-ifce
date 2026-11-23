"""Testa a validação do upload (roda sem carregar o EasyOCR).  python tests_ocr_validacao.py"""
from fastapi import HTTPException
from app.routers.ocr import validar_documento, MAX_SIZE

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 20
PDF = b"%PDF-1.4\n" + b"0" * 20
JPG = b"\xff\xd8\xff\xe0" + b"0" * 20

def codigo(dados, nome, mime=None):
    try:
        return validar_documento(dados, nome, mime)
    except HTTPException as e:
        return e.status_code

casos = [
    ("png ok", codigo(PNG, "a.png", "image/png"), "png"),
    ("pdf ok", codigo(PDF, "a.PDF", "application/pdf"), "pdf"),
    ("jpg ok", codigo(JPG, "a.jpeg", "image/jpeg"), "jpeg"),
    ("vazio", codigo(b"", "a.png"), 422),
    ("5MB+1", codigo(PNG + b"0" * MAX_SIZE, "a.png"), 413),
    ("exe", codigo(b"MZ" + b"0" * 20, "a.exe"), 422),
    ("txt renomeado p/ png", codigo(b"ola mundo", "a.png"), 422),
    ("pdf renomeado p/ png", codigo(PDF, "a.png"), 422),
    ("docx (PK)", codigo(b"PK\x03\x04" + b"0" * 20, "a.docx"), 422),
    ("mime divergente", codigo(PNG, "a.png", "application/pdf"), 422),
]
falhas = 0
for nome, obtido, esperado in casos:
    ok = obtido == esperado
    falhas += not ok
    print(("OK  " if ok else "FAIL"), nome, obtido)
raise SystemExit(falhas)
