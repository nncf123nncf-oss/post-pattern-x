# Python の unicodedata で正解のユニット数を作る（corpus.json）。プロジェクトの計算式（W/F/Aを2・他を1）
import unicodedata, json, random, pathlib
def u(s): return sum(2 if unicodedata.east_asian_width(c) in ('W', 'F', 'A') else 1 for c in s)
base = ['あいうえお', 'ABCabc123', 'ｱｲｳｴｵ', '😀🎉👍', '①②③', '※★☆○●', '～〜…—–', '“” ‘’', 'Ａ１ａ', '€£¥', 'é ü ñ', '日本語テキスト', '😀‍👩', 'ｱ😀A', 'ー−―', '℃°±×÷', '→←↑↓', '│─┌', '☎♪♥', '\n\t ', '０１２', '「」『』【】（）', '〒', '㈱㈲', 'ⅠⅡⅢ', 'ñandú', ' ', '️', '🇯🇵']
random.seed(7)
pool = ''.join(base)
corp = [{'s': b, 'u': u(b)} for b in base]
for i in range(40):
    s = ''.join(random.choice(pool) for _ in range(random.randint(1, 40)))
    corp.append({'s': s, 'u': u(s)})
pathlib.Path(__file__).with_name('corpus.json').write_text(json.dumps(corp, ensure_ascii=False), encoding='utf-8')
print(len(corp))
