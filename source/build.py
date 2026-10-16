# source/index.src.html の __WIDE__ を wide-ranges.txt（Python の east_asian_width W/F/A の範囲）で置き換えて index.html を作る
import pathlib
d = pathlib.Path(__file__).parent
src = (d / 'index.src.html').read_text(encoding='utf-8')
wide = (d / 'wide-ranges.txt').read_text(encoding='ascii').strip()
assert '__WIDE__' in src
(d.parent / 'index.html').write_text(src.replace('__WIDE__', wide), encoding='utf-8', newline='\n')
print('built', (d.parent / 'index.html').stat().st_size)
