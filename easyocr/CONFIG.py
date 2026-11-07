
PDF_DIR = "pdf/"


import os
import logging
from logging.handlers import RotatingFileHandler

# --- OCR ---
IDIOMAS_OCR = ["pt"]
Y_TOLERANCIA = 12            # px para juntar palavras na mesma linha
CONF_MIN = 0.5               # abaixo disso o campo vai com revisar=True

# --- Limites de entrada ---
MAX_FILE_SIZE=5 #Em mb
MAX_PAGINAS = 2
MAX_OCR_SIMULTANEOS = 1      # OCR é pesado; evita estourar CPU/RAM/GPU

# --- Segurança entre serviços (opcional) ---
API_TOKEN = os.getenv("OCR_API_TOKEN", "")   # se vazio, não exige token

# --- Logs ---
PATH_LOGS='logs/'

