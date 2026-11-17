# Personalhandbok · Dometic Tidaholm

Mobilanpassad personalapp med översikt, dokument, blanketter, sökning och favoriter. Kan läggas på hemskärmen eller länkas från Dometic app-portalen. Appen öppnas direkt utan lösenordsruta.

Adress: https://mrmartinpet.github.io/DometicPersonalHandbok/

## Dokument

Lägg originalfiler i `dokument/`. Undermappar blir kategorier, till exempel `dokument/Arbetsmiljö/Rutin.docx`. GitHub Actions publicerar automatiskt efter varje commit till main. Tio personalrutiner finns nu i handboken. Lägg till fler i samma mappstruktur.

DOCX och PPTX får sökbar text och läsvy. Wordtabeller visas som tabeller. PowerPointtext visas i bildordning. Bilder, diagram och ursprunglig layout läses i originalet som finns för nedladdning. DOC/PPT/PDF/XLS/XLSX går att ladda ner och söka på filnamn och kategori; spara äldre Word- och PowerPointfiler som DOCX/PPTX för fulltextsökning. Text i bilder OCR-tolkas inte, och Excelinnehåll läses inte in i textvyn.

Favoriter lagras lokalt i webbläsaren och följer dokumentets sökväg. Byte av filnamn/mapp ger ett nytt dokument-ID. Dokumentdatum avser senaste commit som ändrade filen, inte datum för godkännande av rutinen.

## Blanketter

Lägg tomma blanketter och mallar i `blanketter/`. De visas på sidan **Blanketter** och kan laddas ner i sitt originalformat. Undermappar blir kategorier, till exempel `blanketter/Ledighet/Ansökan.docx`. Filformaten ovan stöds också för blanketter.

Filer i en undermapp med namnet `Blanketter` under `dokument/` visas också som blanketter. Befintliga dokument behöver inte flyttas. Sökväg och dokument-ID bevaras när byggskriptet skapar den nya katalogen.

Inga separata blanketter finns uppladdade ännu. Sidan visar detta tills de första filerna lagts till. Rutiner räknas inte automatiskt som blanketter, och appen skickar inte in ifyllda blanketter.

## Publicering

Pages är aktiverat. GitHub Actions bygger handboken vid varje commit till main och synkar även webbapp och katalog till repots rot för publicering från main. Se status under Actions.

## Lokal körning

Python 3.10+; inga externa byggberoenden.

```
python scripts/build.py
python -m http.server 8000 --directory dist
```

Öppna http://localhost:8000. Webbappens kod ligger i `web/`, byggskriptet i `scripts/`.

## Åtkomst

Detta repo och den publicerade handboken är offentliga enligt valt upplägg. Lösenordsrutan är borttagen. Ingen inloggning eller behörighetskontroll ingår. Publicera endast innehåll som får vara offentligt. En länk från en intern portal ändrar inte appens åtkomstskydd.

Service workern sparar endast appens skal. Dokumentlistan hämtas från nätet för att undvika gamla rutinversioner vid offlineanvändning.
