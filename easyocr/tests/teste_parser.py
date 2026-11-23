"""Testes do parser (sem EasyOCR).  Rodar em easyocr/:  python tests/teste_parser.py"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from datetime import date
from functions.parser import extrair_insumos


def linhas(*textos):
    return [{"text": t, "conf": 0.95, "bbox": None} for t in textos]


def rodar(*textos):
    itens, _ = extrair_insumos(linhas(*textos))
    return {i.ingrediente: i for i in itens}


falhas = 0
def checa(nome, cond):
    global falhas
    falhas += not cond
    print("OK  " if cond else "FAIL", nome)


# 1) caso do log: nome livre com quantidade na frente
r = rodar("1 banana amassada")
checa("1 banana amassada", "Banana amassada" in r and r["Banana amassada"].quantidade == 1)

# 2) alimento sem nenhum atributo é adicionado
r = rodar("Cebola roxa", "Tomate")
checa("sem atributos", set(r) == {"Cebola roxa", "Tomate"} and r["Tomate"].quantidade is None)

# 3) atributos na mesma linha, ordem livre + normalização de unidade
r = rodar("Arroz 500g 3 pacotes val 10/12/2030")
a = r.get("Arroz")
checa("arroz", a and a.peso_valor == 0.5 and a.peso_unidade == "kg" and a.quantidade == 3
      and a.data_vencimento == date(2030, 12, 10))
r = rodar("2 litros de leite integral")
l = r.get("Leite integral")
checa("litros", l and l.peso_valor == 2 and l.peso_unidade == "L" and l.quantidade is None)
r = rodar("Suco 350 ml x4")
s = r.get("Suco")
checa("ml + x4", s and s.peso_valor == 0.35 and s.peso_unidade == "L" and s.quantidade == 4)

# 4) atributos em linhas seguintes são associados ao alimento anterior
r = rodar("Feijão carioca", "1,5 kg", "Validade: 05/01/2031")
f = r.get("Feijão carioca")
checa("atributos em linhas separadas", f and f.peso_valor == 1.5 and f.data_vencimento == date(2031, 1, 5))

# 5) hierarquia refeição > receita > alimentos + fornecedor + marca
itens, _ = extrair_insumos(linhas(
    "Fornecedor: Atacado Silva", "Almoço", "Receita: Feijoada", "Feijão preto 1 kg", "Marca: Camil",
    "Linguiça 2 un", "Jantar: Sopa de legumes", "Cenoura 3"))
d = {i.ingrediente: i for i in itens}
checa("refeição/receita", d["Feijão preto"].refeicao == "almoco" and d["Feijão preto"].receita == "Feijoada")
checa("fornecedor", all(i.fornecedor == "Atacado Silva" for i in itens))
checa("marca", (d["Feijão preto"].extras or {}).get("Marca") == "Camil")
checa("novo jantar", d["Cenoura"].refeicao == "jantar" and d["Cenoura"].receita == "Sopa de legumes"
      and d["Cenoura"].quantidade == 3)

# 6) ruído é ignorado
r = rodar("CUPOM FISCAL", "CNPJ 12.345.678/0001-90", "TOTAL R$ 45,90", "Ingredientes", "Página 1")
checa("ruído", len(r) == 0)

# 7) "Café 500g" é alimento, não refeição
r = rodar("Café 500g")
checa("café como alimento", "Café" in r and r["Café"].peso_valor == 0.5)

sys.exit(falhas)
