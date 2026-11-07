"""Uso (na raiz do projeto):
    python testes_locais/testar_ocr.py testes_locais/amostras/nota.jpg
    python testes_locais/testar_ocr.py testes_locais/amostras/nota.jpg --linhas
"""
import sys
import json

from pathlib import Path
from functions.logs import *
from functions.loading import *
from functions.pipeline import *

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

configurar_logs()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    caminho = Path(sys.argv[1])
    dados = caminho.read_bytes()

    try:
        if "--linhas" in sys.argv:
            paginas, alertas = ler_linhas(dados, caminho.name)
            for pagina, linhas in paginas:
                print(f"\n=== Página {pagina} ===")
                for l in linhas:
                    print(f"[{l['conf']:.2f}] {l['text']}")
            print("\nAlertas:", [a.model_dump() for a in alertas])
            return

        insumos, alertas = processar_documento(dados, caminho.name)
    except ErroLeitura as e:
        print(f"ERRO FATAL -> {e.codigo}: {e.mensagem}")
        return

    print(f"\n{len(insumos)} insumo(s) extraído(s):")
    for i in insumos:
        flag = "REVISAR" if i.revisar else "ok"
        print(f"  [{flag:7}] {i.ingrediente} | {i.peso_valor}{i.peso_unidade or ''} "
              f"| qtd={i.quantidade} | val={i.data_vencimento} | conf={i.confianca:.2f}")
    print(f"\n{len(alertas)} alerta(s):")
    for a in alertas:
        print(f"  {a.codigo}: {a.mensagem}")

    saida = RAIZ / "testes_locais" / "saidas" / f"{caminho.stem}.json"
    saida.parent.mkdir(exist_ok=True)
    saida.write_text(json.dumps(
        {"insumos": [i.model_dump(mode="json") for i in insumos],
         "alertas": [a.model_dump() for a in alertas]}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    print(f"\nJSON salvo em {saida}")


if __name__ == "__main__":
    main()