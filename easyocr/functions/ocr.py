import easyocr, torch, logging
import cv2
import numpy as np
from CONFIG import *

# ocr_imagem(img, y_tol=Y_TOLERANCIA) usa esse `leitor
logging.info(f"EasyOCR carregado (GPU={torch.cuda.is_available()})")
leitor = easyocr.Reader(IDIOMAS_OCR, gpu=torch.cuda.is_available())

def pre_processar_img(img: np.ndarray) -> np.ndarray:
    """Melhora contraste e garante resolução mínima para o EasyOCR."""
    h, w = img.shape[:2]
    if max(h, w) < 1200:
        esc = 1200 / max(h, w)
        img = cv2.resize(img, None, fx=esc, fy=esc, interpolation=cv2.INTER_CUBIC)
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(cinza)

def ocr_imagem(img: np.ndarray, y_tol: int = 12):
    img = pre_processar_img(img)
    palavras = []
    for bbox, texto, conf in leitor.readtext(img, detail=1, paragraph=False):
        xs = [p[0] for p in bbox]; ys = [p[1] for p in bbox]
        palavras.append({
            "text": texto.strip(), "conf": float(conf),
            "x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys),
            "yc": (min(ys) + max(ys)) / 2,
        })

    palavras.sort(key=lambda p: p["yc"])
    linhas_brutas = []                                      # agrupa por altura (mesma linha)
    for p in palavras:
        if linhas_brutas and abs(p["yc"] - linhas_brutas[-1]["yc"]) <= y_tol:
            linhas_brutas[-1]["itens"].append(p)
            L = linhas_brutas[-1]
            L["yc"] = sum(i["yc"] for i in L["itens"]) / len(L["itens"])
        else:
            linhas_brutas.append({"yc": p["yc"], "itens": [p]})

    linhas = []
    for L in linhas_brutas:
        itens = sorted(L["itens"], key=lambda i: i["x0"])   # esquerda -> direita
        x0, x1 = min(i["x0"] for i in itens), max(i["x1"] for i in itens)
        y0, y1 = min(i["y0"] for i in itens), max(i["y1"] for i in itens)
        linhas.append({
            "text": " ".join(i["text"] for i in itens),
            "conf": sum(i["conf"] for i in itens) / len(itens),
            "bbox": [[int(x0), int(y0)], [int(x1), int(y0)], [int(x1), int(y1)], [int(x0), int(y1)]],
        })
    return linhas