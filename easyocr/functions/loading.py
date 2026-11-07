import io, csv, logging
import cv2, numpy as np
import fitz                      # PyMuPDF
from docx import Document        # python-docx
from openpyxl import load_workbook

ASSINATURAS_IMAGEM = (b"\x89PNG", b"\xff\xd8\xff", b"BM", b"II*\x00", b"MM\x00*", b"RIFF")

class ErroLeitura(Exception):
    def __init__(self, codigo, mensagem, status=422):
        self.codigo, self.mensagem, self.status = codigo, mensagem, status

def _linhas_de_texto(texto: str):
    return [{"text": l.strip(), "conf": 1.0, "bbox": None} for l in texto.splitlines() if l.strip()]

def imagem_valida(img) -> bool:
    return img is not None and img.size > 0 and float(np.std(img)) > 5   # imagem toda branca/preta = vazia

def carregar_documento(dados: bytes, nome: str):
    if not dados:
        raise ErroLeitura("LEITURA_VAZIA", "Arquivo vazio (0 bytes).")

    fontes = []
    try:
        if dados[:4] == b"%PDF":
            pdf = fitz.open(stream=dados, filetype="pdf")
            for n, pag in enumerate(pdf, 1):
                texto = pag.get_text()
                if len(texto.strip()) > 20:
                    fontes.append(("texto", _linhas_de_texto(texto), n))
                else:
                    pix = pag.get_pixmap(dpi=200)
                    img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)
                    img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR)
                    fontes.append(("imagem", img, n))

        elif dados[:2] == b"PK":                       # docx ou xlsx (ambos são zip)
            try:
                doc = Document(io.BytesIO(dados))
                linhas = [p.text for p in doc.paragraphs]
                for t in doc.tables:
                    linhas += [" ".join(c.text for c in r.cells) for r in t.rows]
                fontes.append(("texto", _linhas_de_texto("\n".join(linhas)), 1))
            except Exception:
                wb = load_workbook(io.BytesIO(dados), data_only=True)
                linhas = [" ".join(str(c) for c in row if c is not None)
                          for ws in wb for row in ws.iter_rows(values_only=True)]
                fontes.append(("texto", _linhas_de_texto("\n".join(linhas)), 1))

        else:
            img = cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)
            if img is not None:
                fontes.append(("imagem", img, 1))
            elif dados.startswith(ASSINATURAS_IMAGEM):
                raise ErroLeitura("ARQUIVO_CORROMPIDO", f"A imagem '{nome}' está corrompida ou incompleta.")
            else:                                      # tenta como texto/csv
                try:
                    fontes.append(("texto", _linhas_de_texto(dados.decode("utf-8")), 1))
                except UnicodeDecodeError:
                    raise ErroLeitura("FORMATO_NAO_SUPORTADO",
                                      f"Não foi possível interpretar '{nome}'.")
    except ErroLeitura:
        raise
    except Exception as e:
        logging.error(f"Arquivo corrompido '{nome}': {e}")
        raise ErroLeitura("ARQUIVO_CORROMPIDO", f"O arquivo '{nome}' está corrompido ou ilegível.")

    return fontes