# KI-Hilfen (EU AI Act, DSGVO, AGG)

Grundsatz aus CLAUDE.md: **Die KI schlägt vor, ein Mensch entscheidet.** KI im Recruiting ist nach EU AI Act Hochrisiko
(Anhang III Nr. 4: Stellenanzeigen gezielt schalten, Bewerbungen sichten/filtern, Kandidaten bewerten). recrewted ist dabei
Betreiber (Art. 26); Anbieter des Modells ist Anthropic. Ab wann die Hochrisiko-Pflichten verbindlich gelten, ist vor dem
Livegang mit DSB/Anwalt zu klären (der Zeitplan war politisch in Bewegung) – umgesetzt sind sie hier unabhängig davon.

## Funktionen

| Funktion | Wo | Risiko | Aufsicht |
| --- | --- | --- | --- |
| Anzeigen-Entwurf | Vakanz › Anzeigen | Recruiting-Kontext | Version wie jede andere; Prüfung m/w/d, Gehalt, AGG; Freigabe durch Recruiter |
| Kriterien- und Fragen-Vorschläge | Vakanz › KI-Vorschläge | legt Auswahlkriterien nahe | AGG- und Stellvertreter-Filter; einzeln auswählen; Ausschluss nur durch bewusstes Ankreuzen |
| Gesprächsleitfaden | Vakanz › Gesprächsleitfaden | gering | übernehmen oder verwerfen |
| Bewertungsvorschlag | Bewerbung › KI-Bewertungsvorschlag | **Hochrisiko** | nur mit Kunden-Freischaltung; Belegpflicht; steht neben dem Bewertungsbogen; Recruiter bewertet selbst |

Das KI-Register mit Überwachung liegt unter `/admin/ki`.

## Umgesetzte Pflichten

- **Menschliche Aufsicht (Art. 14/26):** Keine KI-Ausgabe wird automatisch wirksam. Bewertungsvorschläge stehen neben dem
  Bewertungsbogen und füllen ihn nicht vor (gegen Automatisierungs-Bias). Ausschlussfragen werden nie automatisch aktiv.
- **Protokolle (Art. 12/26 Abs. 6):** `ai_recommendations` speichert je Aufruf Zweck, Kunde, Vakanz/Bewerbung, Modell
  (Anbieter, Region, Modell-ID), Prompt-Version, SHA-256 der Eingabe, Ausgabe, Dauer, Status und die menschliche Entscheidung
  (übernommen/geändert/verworfen, Endergebnis, wer, wann). Vorschlag und Entscheidung sind nachträglich nicht änderbar
  (Trigger `ai_decision_guard`). Aufbewahrung: mit der Bewerbung, also mindestens sechs Monate nach Abschluss.
- **Überwachung (Art. 26 Abs. 5):** `ai_monitoring()` zeigt Übernahme-, Änderungs- und Verwerfungsquoten sowie die mittlere
  Abweichung zwischen KI-Stufe und menschlicher Stufe. Not-Aus: `AI_ENABLED` (global), Schalter je Kunde.
- **Erklärbarkeit:** Jede Stufe braucht ein wörtliches Zitat als Beleg und eine Begründung. Zitate aus dem Fragebogen werden
  automatisch gegen die Antworten geprüft; ohne prüfbaren Beleg wird die Stufe entfernt. Zitate aus dem Lebenslauf sind als
  „bitte selbst nachsehen“ markiert.
- **Diskriminierungsschutz (AGG):** Prompts verbieten geschützte Merkmale und Stellvertreter. Kriterien und Fragen mit solchen
  Merkmalen werden vor der Anzeige herausgefiltert (`src/lib/ai/legal.ts`), Anzeigen laufen durch die AGG-Prüfung.
  An das Modell gehen weder Name noch Kontaktdaten; der Lebenslauf enthält sie jedoch – das Modell ist angewiesen, sie zu
  ignorieren. Echte Schwärzung kommt mit dem CV-Parsing (Release 2).
- **Information der Betroffenen (Art. 26 Abs. 11, Art. 13/14 DSGVO):** Hinweis im Bewerbungsformular und Abschnitt in der
  Datenschutzerklärung (Entwurf). Kunden sehen im Bewertungsbogen „KI-gestützt bewertet, vom Recruiter geprüft“.
- **Keine automatisierte Einzelentscheidung (Art. 22 DSGVO):** Es gibt keine KI-gestützte Absage oder Aussortierung.
- **KI-Kompetenz (Art. 4):** Hinweise direkt an jeder Funktion; Schulung der Recruiter vor dem Einschalten der
  Bewertungsvorschläge einplanen.

## Betrieb

- Anbieter: Claude (Anthropic) über **Amazon Bedrock in Frankfurt** (`eu-central-1`), Client `AnthropicBedrockMantle`.
  Die Claude API direkt kann Verarbeitung nur auf „US“ oder „global“ festlegen, nicht auf die EU – nur nach Freigabe des DSB.
- Modell: `claude-opus-5-5` (Bedrock-ID `anthropic.claude-opus-5-5`). Vor dem Einschalten prüfen, ob es in `eu-central-1`
  angeboten wird; sonst `AI_MODEL` auf ein dort verfügbares Modell setzen.
- Stand 22.11.2026: `AI_ENABLED=true`, `AI_PROVIDER=anthropic` gesetzt, `ANTHROPIC_API_KEY` von Peter eingetragen. Mit der direkten
  API bleiben Bewertungsvorschläge technisch gesperrt, bis `AI_SCORING_APPROVED=true` gesetzt ist (nach DSB-Freigabe).
- Vercel-Variablen: `AI_ENABLED=true`, optional `AI_PROVIDER` (`bedrock`|`anthropic`), `AI_AWS_REGION`, `AI_MODEL`,
  dazu AWS-Zugang für Bedrock (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` eines IAM-Users nur mit Bedrock-Invoke-Recht,
  oder ein Bedrock-API-Key) bzw. `ANTHROPIC_API_KEY`. Nie ins Repo.
- Ablehnungen des Modells (`stop_reason: refusal`) werden protokolliert und als „ohne KI weiterarbeiten“ angezeigt;
  es gibt keine automatische Ausweichlösung auf ein anderes Modell.
- AV-Vertrag mit AWS (bzw. Anthropic), Eintrag ins Verarbeitungsverzeichnis, ggf. Datenschutz-Folgenabschätzung für die
  Bewertungsvorschläge. Die Freischaltung je Kunde setzt dessen Zustimmung im Vertrag voraus.
- Noch nicht gegen ein echtes Modell getestet: Die Aufrufe sind typgeprüft und die Prüflogik getestet; der erste echte
  Lauf je Funktion sollte mit Testdaten lokal passieren, nicht auf prod.
