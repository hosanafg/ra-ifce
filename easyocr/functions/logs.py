from CONFIG import *
import os 

BANNER = r"""

░████████   ░███████             ░██████     ░██████  ░█████████  
░██    ░██  ░██   ░██           ░██   ░██   ░██   ░██ ░██     ░██ 
░██    ░██  ░██    ░██         ░██     ░██ ░██        ░██     ░██ 
░████████   ░██    ░██ ░██████ ░██     ░██ ░██        ░█████████  
░██     ░██ ░██    ░██         ░██     ░██ ░██        ░██   ░██   
░██     ░██ ░██   ░██           ░██   ░██   ░██   ░██ ░██    ░██  
░█████████  ░███████             ░██████     ░██████  ░██     ░██ 
                                                                                                                                  
"""

def configurar_logs():
    os.makedirs(PATH_LOGS, exist_ok=True)
    raiz = logging.getLogger()
    if raiz.handlers:                       # evita duplicar se chamar duas vezes
        return

    caminho_log = f"{PATH_LOGS}/ocr.log"

    # >>> BANNER: gravado cru no arquivo, no início de cada inicialização <<<
    with open(caminho_log, "a", encoding="utf-8") as f:
        f.write("\n" + BANNER + "\n")

    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    raiz.setLevel(logging.INFO)
    arq = RotatingFileHandler(caminho_log, maxBytes=5_000_000,
                              backupCount=5, encoding="utf-8")
    arq.setFormatter(fmt)
    con = logging.StreamHandler()
    con.setFormatter(fmt)
    raiz.addHandler(arq)
    raiz.addHandler(con)

    logging.info("API de extração OCR iniciada")