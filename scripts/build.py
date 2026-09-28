"""Build a static handbook; Office originals remain in dokument/. No dependencies."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json, re, shutil, hashlib, subprocess, argparse

ROOT = Path(__file__).resolve().parents[1]
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
SUPPORTED = {'.docx', '.pptx', '.doc', '.ppt', '.pdf'}

def paragraphs(node, namespace):
    if node is None:
        return []
    result = []
    for paragraph in node.iter(namespace+'p'):
        parts = []
        for item in paragraph.iter():
            if item.tag == namespace+'t':
                parts.append(item.text or '')
            elif item.tag == namespace+'tab':
                parts.append('\t')
            elif item.tag in {namespace+'br', namespace+'cr'}:
                parts.append('\n')
        result.append(''.join(parts).strip())
    return result

def extract(path):
    blocks = []
    with ZipFile(path) as z:
        if sum(i.file_size for i in z.infolist()) > 150_000_000:
            raise ValueError('Dokumentet är för stort för textutvinning')
        if path.suffix.lower() == '.docx':
            body = ET.fromstring(z.read('word/document.xml')).find(W+'body')
            for child in body:
                if child.tag == W+'p':
                    text = '\n'.join(t for t in paragraphs(child, W) if t)
                    style = child.find(W+'pPr/'+W+'pStyle')
                    heading = style is not None and re.search(r'heading|rubrik|title', style.get(W+'val',''), re.I)
                    if text: blocks.append({'type':'heading' if heading else 'paragraph', 'text':text})
                elif child.tag == W+'tbl':
                    rows = [['\n'.join(paragraphs(cell,W)) for cell in row.findall(W+'tc')] for row in child.findall(W+'tr')]
                    if rows: blocks.append({'type':'table','rows':rows})
        else:
            # Read presentation order, not numerical ZIP file order.
            rels = ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
            targets = {r.get('Id'):r.get('Target') for r in rels}
            pres = ET.fromstring(z.read('ppt/presentation.xml'))
            rid = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
            for number, slide_id in enumerate(pres.iter(P+'sldId'),1):
                target = targets[slide_id.get(rid)]
                name = target.lstrip('/') if target.startswith('/') else 'ppt/'+target
                slide = ET.fromstring(z.read(name))
                text = '\n'.join(t for t in paragraphs(slide,A) if t)
                blocks.append({'type':'heading','text':f'Bild {number}'})
                blocks.append({'type':'paragraph','text':text or 'Den här bilden saknar läsbar text. Öppna originalet för att se innehållet.'})
    return blocks

def build(destination):
    out = Path(destination)
    if out.exists(): shutil.rmtree(out)
    shutil.copytree(ROOT/'web',out)
    shutil.copytree(ROOT/'dokument', out/'dokument',ignore=shutil.ignore_patterns('README.md','.gitkeep'))
    docs=[]
    for path in sorted((ROOT/'dokument').rglob('*')):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED or path.name.startswith('~$'): continue
        relative=path.relative_to(ROOT).as_posix()
        category=path.parent.name if path.parent != ROOT/'dokument' else 'Övrigt'
        blocks=[]; warning=None
        if path.suffix.lower() in {'.docx','.pptx'}:
            try: blocks=extract(path)
            except Exception as error:
                warning='Texten kunde inte läsas in. Ladda ner originaldokumentet.'
                print(f'Warning: {relative}: {error}')
        else: warning='Öppna originaldokumentet för att läsa innehållet. Sökning fungerar på filnamn och kategori.'
        text='\n'.join(b.get('text','') if b['type']!='table' else '\n'.join(' '.join(r) for r in b['rows']) for b in blocks)
        if not text.strip() and not warning: warning='Ingen text hittades. Öppna originalet för att se bilder och innehåll.'
        stamp=subprocess.run(['git','log','-1','--format=%cs','--',relative],cwd=ROOT,capture_output=True,text=True).stdout.strip()
        docs.append({'id':hashlib.sha256(relative.encode()).hexdigest()[:16], 'title':path.stem.replace('_',' '),
          'category':category,'format':path.suffix[1:].upper(),'path':relative,'updated':stamp or None,
          'size':path.stat().st_size,'blocks':blocks,'text':text,'warning':warning})
    (out/'catalog.json').write_text(json.dumps({'documents':docs},ensure_ascii=False),encoding='utf-8')
    (out/'.nojekyll').touch()
    print(f'Built {len(docs)} documents → {out}')

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--out',default=str(ROOT/'dist')); args=parser.parse_args(); build(args.out)
