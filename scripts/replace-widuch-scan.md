# Replacing the Widuch scan

Analysis: /Users/nielspfeffer/Projects/mrs2image/scans/WR0225_02_2023-04-12_09-29-48/WR0225_02_2023-04-12_09-29-48_I_Schumann_Traeumere_analysis_straightened_300.25dpi.txt

## The scans
| | old | new |
| --- | --- | --- |
| image length | 10717.8 mm | 8800.0 mm |
| roll width | 330.1 mm | 328.3 mm |
| hole separation | 37.95 px | 37.6685 px |
| margins bass / treble | 107 / 73 px | 104 / 99 px |
| holes (chains) | 725 | 724 |
| first to last hole, aligned | 1438.4 mm–10107.1 mm | 1345.9 mm–10082.0 mm |
| shift, stretch | 1673.1 mm, 0.83041 | 1265.3 mm, 1.00166 |

## Alignment to the reference copy (Stanford d229954b)
- the desk's fit through the first and last tenth of the onsets: shift 1343.3 mm, stretch 0.98209
- best on a grid of 2 mm and 0.001 around it: shift 1263.3 mm, stretch 1.002
- refined over 458 onset pairs: shift 1265.3 mm, stretch 1.00166
- onset residuals against the reference, 462 pairs within 5 mm: median -0.02 mm, spread 0.65 mm (MAD), largest 4.6 mm

## Old holes against new, for the 723 symbols both scans carry
- onset: median -0.11 mm, spread 0.12 mm (MAD), largest 0.7 mm
- release: median -0.11 mm, spread 0.11 mm (MAD), largest 25.1 mm
- length: median -0.02 mm, spread 0.12 mm (MAD), largest 24.9 mm
- drift of the onset difference along the roll: -0.03 mm per metre

## Matching
- symbols to place on the new copy: 726 (726 in force at A1, 725 carried by the old copy)
- matched within the collation tolerance: 723
- matched the only one of its meaning: 1
  - treble Rewind at 10059.9 mm–10107.1 mm (symbol_924274fc-32ea-40be-88b0-ea2f0e5e7928, inserted in A, 0 other carriers) -> treble Rewind at 10059.7 mm–10082.0 mm (track 91), 25.1 mm off
- carriers replaced: 723, added: 1, dropped: 2
  - added: bass SoftPedalOn at 1346.2 mm–1357.1 mm (symbol_c11999fe-36f4-48b9-9104-bcac8b087595, inserted in A, 2 other carriers)

## Symbols without a hole on the new scan (2)
- bass MotorOn at 1609.2 mm–1610.2 mm (symbol_9c6b9119-f534-4ed6-90b7-9b81eca7b91f, inserted in A, 0 other carriers)
- treble SustainPedalOn at 9178.6 mm–9180.1 mm (symbol_95dacea0-bdcd-4ac2-b7e5-5c9b9509f1bd, inserted in A, 0 other carriers)

## Withdrawn from the tree, having no carrier left (2)
- bass MotorOn at 1609.2 mm–1610.2 mm (symbol_9c6b9119-f534-4ed6-90b7-9b81eca7b91f, inserted in A, 0 other carriers)
- treble SustainPedalOn at 9178.6 mm–9180.1 mm (symbol_95dacea0-bdcd-4ac2-b7e5-5c9b9509f1bd, inserted in A, 0 other carriers)
- edits that inserted or deleted them, trimmed:
  - B: edit 097dad02-b0b7-4f04-9489-ad4b6d1fad39, now 0 insertions and 0 deletions
  - B: edit e5d26fd0-1d0d-4a33-8b55-492b0bf0340a, now 0 insertions and 0 deletions
  - A: edit de8611e6-aed3-404b-bfe0-57867fc5d638, now 720 insertions and 0 deletions
- edits removed because nothing else was left in them:
  - B: edit 097dad02-b0b7-4f04-9489-ad4b6d1fad39
  - B: edit e5d26fd0-1d0d-4a33-8b55-492b0bf0340a

## Holes on the new scan without a symbol (0)

## Checks
- old feature ids still referenced: 0
- carriers pointing nowhere: 0
- deletions of withdrawn symbols left behind: 0
- deletions of symbols that do not exist: 11 (11 before, untouched)
- schema: valid
