# Preismodelle – Stand der Überlegungen

Rechenmodell mit allen Varianten (Annahmen änderbar): https://claude.ai/artifact/NqF3PaYYqnQHmNdsfc2GQp

Für den Pilot werden 2–3 Modelle ausgewählt. Das System muss diese Abrechnungsarten technisch abbilden können (Feld `vacancies.pricing_model`):

| Modell | Abrechnung | Release |
| --- | --- | --- |
| `fixed_starter` / `fixed_pro` / `fixed_enterprise` | Festpreis pro Vakanz, Media inklusive | MVP |
| `service_fee_media_passthrough` | Service-Fee + Media über recrewted mit Aufschlag | MVP |
| `service_fee_customer_media` | Service-Fee, Media über Kundenkonto | Release 2 |
| `success_fee` | % vom Jahresgehalt bei Einstellung | MVP (optional) |
| `hybrid` | Grundgebühr + Erfolgsbonus | MVP (optional) |
| `subscription` | Monatliches Abo / Retainer | Release 2 |
| `self_service_platform` | Plattformgebühr + Media mit Aufschlag | Release 2 |
| `self_service_per_candidate` | Preis pro qualifiziertem Kandidaten | Release 2 |
| `license` | Lizenz für Personaldienstleister | Release 3 |

Garantie: messbar pro Vakanz (z. B. Anzahl qualifizierter Kandidaten in X Tagen, sonst kostenlose Verlängerung). Werte legt projx fest; Formulierung durch Anwalt.
