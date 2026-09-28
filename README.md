# Personalhandbok · Dometic Tidaholm

Mobilanpassad personalhandbok med fulltextsökning, kategorier, favoritmarkering och läsvy. Kan läggas på hemskärmen eller länkas från Dometic app-portalen.

Adress efter aktiverad publicering: https://mrmartinpet.github.io/DometicPersonalHandbok/

## Dokument

Lägg originalfiler i `dokument/`. Undermappar blir kategorier, till exempel `dokument/Arbetsmiljö/Rutin.docx`. GitHub Actions publicerar automatiskt efter varje commit till main. Inga interna rutiner eller påhittade policydokument medföljer.

DOCX och PPTX får sökbar text och läsvy. Wordtabeller visas som tabeller. PowerPointtext visas i bildordning. Bilder, diagram och ursprunglig layout läses i originalet som finns för nedladdning. DOC/PPT/PDF går att ladda ner och söka på filnamn och kategori; spara äldre Officefiler som DOCX/PPTX för fulltextsökning. Text i bilder OCR-tolkas inte.

Favoriter lagras lokalt i webbläsaren och följer dokumentets sökväg. Byte av filnamn/mapp ger ett nytt dokument-ID. Dokumentdatum avser senaste commit som ändrade filen, inte datum för godkännande av rutinen.

## Publicering

Settings → Pages → Build and deployment → Source: **GitHub Actions**. Kör därefter arbetsflödet **Publicera Personalhandbok** om det inte redan körs. Automatisk Pages-aktivering kan kräva att en administratör först väljer källan manuellt.

## Lokal körning

Python 3.10+; inga externa byggberoenden.

```
python scripts/build.py
python -m http.server 8000 --directory dist
```

Öppna http://localhost:8000. Webbappens kod ligger i `web/`, byggskriptet i `scripts/`.

## Åtkomst

Detta repo och den publicerade handboken är offentliga enligt valt upplägg. Ingen inloggning eller behörighetskontroll ingår. Publicera endast innehåll som får vara offentligt. En länk från en intern portal ändrar inte appens åtkomstskydd.

Service workern sparar endast appens skal. Dokumentlistan hämtas från nätet för att undvika gamla rutinversioner vid offlineanvändning.
