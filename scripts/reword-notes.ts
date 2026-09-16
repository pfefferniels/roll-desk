/**
 * Rewords the edition's notes in the register of a critical apparatus:
 * the befund telegraphic, the inference still a sentence, the evidence
 * untouched. Also takes out four renderings that read as coinages
 * (Eichtreppe, Staubausschlüsse, Anschlagskalen, laufende Mediane).
 *
 * A rewording names the note by its path, checks how the note begins so
 * that it cannot rewrite one that has moved, and is refused if a number
 * or a reference of the old note is missing from the new one.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/reword-notes.ts [--write]
 */

import { finish, Json, readEdition, structuralProblems } from './storedEdition'

const refer = (id: string) => `{{${id}}}`

const R1 = refer('0e5f443d-0dd9-4810-9dbe-7f5007df490f')
const R2 = refer('19fd4209-81cc-4d03-b2c3-fc7518dbba14')
const R3 = refer('bab25aef-f80d-4ff0-b187-63030df8305a')
const R4 = refer('c9050e75-97a8-4862-9533-0f4b1439802b')
const R11 = refer('755d411a-0ba4-4f59-90a7-f231be3e66ad')
const L1 = refer('2767844e-311e-4b97-8fb2-1b78db41e220')
const L2 = refer('e07c4be8-f44b-496d-8a6c-026006340441')

interface Rewording {
    /** Where the note sits, as `dump-notes.ts` prints it. */
    path: string
    /** How the note begins now, so that a moved or already reworded note is not overwritten. */
    startsWith: string
    /** The paragraphs of the new note. */
    after: readonly string[]
    /**
     * Numbers the new note deliberately leaves out, because they are
     * made elsewhere and were only repeated here.
     */
    mayDrop?: readonly string[]
}

/**
 * What the four notes on L1's readings against R2 said four times over.
 * The weighing belongs to L1's derivation, which each of them now points
 * to, so that the argument stands once.
 */
const againstR2 = (millimetres: string) => [
    `Stanzung an der Stelle von ${R1} (${millimetres} mm), überliefert allein in Wi1, dort wo ${R2} sie verschoben oder getilgt hat. Eine von vier solchen Stellen: entweder eigene Lesart von ${L1}, die die Stelle von ${R1} wieder trifft, oder Bewahrung gegen ${R2}, was sich mit der Ableitung über ${R3} nur unter Kontamination verträgt. Zur Abwägung siehe die Ableitung von ${L1}.`
]

/** The figures that weighing carries, which the four notes no longer repeat. */
const weighedInDerivation = ['45', '0,7', '1000']

const REWORDINGS: readonly Rewording[] = [
    {
        path: 'versions/1/basedOn/0/@annotation/belief/reasons/0',
        startsWith: `${R3} ist durch kein Exemplar überliefert`,
        after: [
            `${R3}: durch kein Exemplar überliefert, erschlossen aus dem Verhältnis von ${R4} und ${L1}.`,

            `Sieben Hinzufügungen, bisher ${R4} allein zugeschrieben, in ${L1} an genau deren Stelle, innerhalb von 3,3 mm und damit so genau wie die gemeinsamen Stanzungen: Forzandi im Bass 2365 und 4281 mm, Crescendo im Diskant 5159 mm, je mit beiden Stanzungen; Crescendi im Diskant 4816, 5037, 6663 und 7832 mm mit einer. Das Crescendo im Bass 2464 mm liegt 3,8 mm davor, knapp außerhalb, gehört aber wohl hierher: zwei unabhängige Paare so nah beieinander sind unwahrscheinlich.`,

            `Gleiche Stanzung an gleicher Stelle kaum zweimal unabhängig. ${L1} unter ${R4} erklärte das; dagegen stehen die übrigen 118 Stanzungen von ${R4}, von denen ${L1} keine trägt, darunter keines der 23 Paare der Mittelstimmen-Differenzierung, dazu die Bereinigungen und die Verschiebung des c′ in T. 4. Wer von ${R4} ausginge, hätte das alles zurücknehmen müssen.`,

            `Also standen die sieben vor beiden: ${R4} und ${L1} gehen auf eine gemeinsame Vorlage nach ${R2} zurück, und das ist ${R3}. Ihr gehören die sieben, ${R4} erst die 118 übrigen.`,

            `Dazu das Forzando ab 4287 mm: es macht das An von ${R2} bei 4334 mm wirksam, das nach dem offenen An bei 4050 mm ohne Wirkung war. Eine Einfügung, die eine Redundanz wirksam macht, ist sonst nicht anzunehmen; hier liest sie sich als Korrektur.`
        ]
    },
    {
        path: 'versions/4/basedOn/0/@annotation/belief/reasons/0',
        startsWith: `Die Fassung ${R11} umfasst, was allein`,
        after: [
            `${R11}: nur in Wi1, ohne Antwort auf anderem Ast – allmähliches Aufheben der Verschiebung T. 9; Rückspulstanzung; fünf Crescendo-/Forzando-Befehle T. 2, 6, 7; zwei Tilgungen (Diskant-Crescendo ab 1708,6 mm; Dämpferpedal ab 5370,9 mm).`,

            `45 weitere Lesarten nur in Wi1, doch schon in ${R1}: meist ${R2} nahebei gleichartig, also verschoben; sonst Auflösung einer Redundanz von ${R1}, die eine spätere Einfügung nicht nachträglich erklärte.`
        ]
    },
    {
        path: 'versions/8/basedOn/0/@annotation/belief/reasons/0',
        startsWith: `Die Lesung von Peter Phillips zeigt 142 der 157 Stanzungen`,
        after: [
            `Phillips' Lesung: 142 der 157 Stanzungen, die ${R2} zu ${R1} hinzufügt, an ihrer Stelle; dazu die sieben Hinzufügungen, die ${R3} begründen, und eine weitere nahebei; dazu das Crescendo-Paar vor dem Auftakt, sonst nur in St1.`,

            `Eigen: bei 3459, 8104 und 9042 mm fehlt das An eines Crescendos von ${R2}, dessen Ab wirkungslos stehen bleibt – die Betonungen also vorgefunden und deren An getilgt.`,

            `Nicht vorhanden: Lesarten von ${R11} und ${L2}. Erhalten: die Redundanzen von ${R2} im Diskant, die ${R4} bereinigt.`,

            `Dagegen: an vier der 45 Stellen, an denen ${R2} eine Stanzung von ${R1} verschiebt oder tilgt, trägt sie die von ${R1}. Doch treffen zufällig gelegte Stanzungen dieser Lesung solche Stellen im Mittel 0,7-mal und bis zu siebenmal, während die Hinzufügungen, die ${R3} begründen, weit über dem Zufall liegen.`,

            `Gegenüber ${L2} eine eigene Umstanzung: beginnt mit einer Löschreihe, die ${L2} nicht hat; Trachtmans Lesung von Gourlins Exemplar dieser Fassung nennt Tempo 75, Chases Exemplar von ${L2} dagegen 80.`
        ]
    },
    {
        path: 'copies/5/carries/0/@annotation/belief/reasons/0',
        startsWith: `Die Lautstärke der gehörten Töne folgt der Dynamik, die ${R4} emuliert`,
        after: [
            `Lautstärke der gehörten Töne folgt der Dynamik von ${R4} besser als der von ${R1}, ${R11} und ${R2}: Anschlagstärken von Transkun allein R² 0,65 gegen 0,61 bei ${R2}; von Kong allein 0,55 gegen 0,49; ebenso auf dem Mittel der vier Lautstärkemaße unter allen sieben Einstellungen des Emulators.`,

            `Die Lesarten, die ${R2} und ${R4} zu ${R1} hinzufügen, vorhanden (A-posteriori-Wahrscheinlichkeit 1,00 auf dem Mittel der vier Maße).`,

            `Zuordnung der Töne allein über ihr Timing, das in allen roten Fassungen gleich ist; gegen ${R1} oder ${R2} ausgerichtet dieselbe Paarung.`,

            `Von 33 Passagen, deren Lesarten die Lautstärke genug ändern, um sie zu beurteilen, weicht eine von ${R4} ab: das Crescendo im Bass von ${R2} bei 3360,8 mm (p = 0,013), im Rahmen des Zufalls.`,

            `Die Prämissen schließen ein Instrument unbekannter Regulierung ein; daher nicht höher als wahrscheinlich gehalten.`
        ]
    },
    {
        path: 'copies/7/carries/0/@annotation/belief/reasons/0',
        startsWith: `Töne und Dämpferpedal stimmen mit Phillips' Lesung überein`,
        after: [
            `Töne und Dämpferpedal stimmen mit Phillips' Lesung überein; abweichend allein ein cis′′ in T. 14 (Lücke von 3 mm, vermutlich eine fehlende Stanzung dieses Exemplars) und ein doppeltes Ab des Pedals bei 4468 mm.`,

            `Anschlagstärken folgen der Dynamik von Phillips' Stanzungen, geprüft in deren Kodierung. Wo das Verfahren unterscheiden kann: Hinzufügungen von ${R4}, die ${L1} trägt, vorhanden (sieben Einheiten, gepoolter z-Wert +1,15 ± 0,23); Stanzungen von ${R2}, die ${L1} tilgt, fehlen (vier Einheiten, −1,26 ± 0,10); Differenzierung der Mittelstimmen fehlt (−1,00 ± 0,18).`,

            `Auf Phillips' eigener Standard-MIDI-Datei gibt dasselbe Verfahren wieder, was seine Stanzungen zeigen, außer vor dem ersten Ton; das Crescendo-Paar vor dem Auftakt ist daher allein durch Phillips' Lesung bezeugt.`,

            `Eine Änderung durch den Pianozug zeigen die Anschlagstärken in T. 8′ bis 15 nicht.`
        ]
    },
    {
        path: 'copies/8/carries/0/@annotation/belief/reasons/0',
        startsWith: `Die Lautstärke der gehörten Töne folgt der Dynamik, die ${R1} emuliert`,
        after: [
            `Lautstärke der gehörten Töne folgt der Dynamik von ${R1} besser als der von ${R2}, ${R3} oder ${R4}: Anschlagstärken von Transkun R² 0,74 gegen 0,55 bei ${R2} und 0,52 bei ${R4}; von Kong 0,69 gegen 0,52; ebenso auf dem Mittel von vier Lautstärkemaßen unter allen sieben Einstellungen des Emulators.`,

            `Von 23 Passagen mit Hinzufügungen von ${R2}, beurteilbar nach der Änderung der Lautstärke, spricht eine für sie. Wo ${R2} eine Stanzung von ${R1} verschiebt oder tilgt, folgt die Aufnahme in allen 15 beurteilbaren Passagen ${R1}; ebenso den Crescendi, die ${R1} selbst hat, in beiden Hälften. Beschädigung der Rolle oder Ausfall am Instrument erklärt diese Lesarten nicht.`,

            `Auf verformten Instrumenten emuliert – langsamere und schnellere Bälge, ausgefallene Ventile, gekrümmte Anschlagskurven – erscheinen ${R2} und ${R4} in höchstens 0,5 % der Ziehungen als ${R1} oder ${R11}. Keine Strecke der Aufnahme weicht über den Zufall hinaus von ${R1} ab; dieselben Skripte ergeben für die Aufnahme von Schmitz' Exemplar weiterhin ${R4}.`,

            `Die Prämissen schließen ein Instrument unbekannter Regulierung ein, dessen Vorsetzer eine Ampico-Mechanik trug; daher nicht höher als wahrscheinlich gehalten.`
        ]
    },
    {
        path: 'copies/0/readFrom',
        startsWith: 'Die Lesung kommt aus der Analyse, die SUPRA zum eigenen Scan veröffentlicht',
        after: [
            `Lesung aus der Analyse, die SUPRA zum eigenen Scan veröffentlicht: mf320jq4997_analysis.txt zu https://purl.stanford.edu/mf320jq4997. Dass es diese und nicht die andere rote Analyse ist, sagen die hier eingetragenen Maße: Ränder 54 und 117 px, Rollenbreite 3888,91 px, Spurabstand 37,7646 px.`,

            `Signatur „Stanford Libraries CONDON ROLL 47“ (sul:ars0163_cr47_welte_225), wie das zweite Stanforder Exemplar aus der Sammlung Denis Condon. Der Katalog vermerkt allein das Papier, „Lined paper“ und „Ruled paper“.`,

            `Randrisse zählt die Analyse keine; die rote 225, die Peter Phillips gelesen hat, ist daher das andere Stanforder Exemplar.`,

            `Gemessen hat Stanford, nicht die Edition. Die Längsauflösung von 300,25 dpi, in jeder Analyse gleich, ist eine Konstante des Geräts und keine Messung an dieser Rolle.`
        ]
    },
    {
        path: 'copies/1/readFrom',
        startsWith: 'Die Lesung kommt aus wv912mm2332_analysis.txt',
        after: [
            `Lesung aus wv912mm2332_analysis.txt zu https://purl.stanford.edu/wv912mm2332, kenntlich an den hier eingetragenen Maßen: Ränder 32 und 152 px, Rollenbreite 3899,59 px, Spurabstand 37,7477 px.`,

            `Signatur „Stanford Libraries CONDON ROLL 48“ (sul:ars0163_cr48_welte_225). Da beide roten Stanforder Exemplare aus der Sammlung Condon stammen, unterscheidet die Provenienz sie nicht; der Zustand des Papiers tut es. Phillips, der seine rote 225 von einer Condon-Rolle gelesen hat, notiert „roll has damaged edges from half way in, otherwise good“; die Analyse zählt hier sieben Randrisse zwischen 73 und 89 Prozent der Rollenlänge, fünf im Bass, zwei im Diskant, dazu 104 als Staub ausgeschiedene Löcher und ein zweifelhaftes Loch, während St1 keinen einzigen Riss hat.`,

            `Seine Datei „Traumerei (Schumann) Grunfeld RW.mid“ von 2022, am 8. September 2026 per Mail geschickt, zählt 463 Töne wie die Lesung dieses Exemplars, St1 zählt 464. Ihr Lautstärkeverlauf korreliert über die gemeinsamen Töne mit diesem Exemplar zu r = 0,93 (457 von 463 zugeordnet), mit St1 zu r = 0,72 (432 Töne). Beide Vergleiche laufen über zwei verschiedene Emulatoren, seinen und midi2exp; es zählt daher der Abstand der Werte, nicht ihre Höhe.`,

            `Phillips liest pneumatisch, nicht optisch. Geschickt hat er die emulierte Fassung seiner Lesung: Tonumfang 34 bis 82, neunundzwanzig Anschlagstärken, Pedale als Controller 64 und 67. Die Ausdrucksperforationen fehlen darin; als Zeuge für Stanzorte taugt die Datei erst mit der E-Roll-Datei.`
        ]
    },
    {
        path: 'copies/3/readFrom',
        startsWith: 'Der Rollenscan selbst, 2432 × 54286 Punkte',
        after: [
            `Der Rollenscan selbst, 2432 × 54286 Punkte, im frühen CIS-Kopf von 2002, der weder Gerät noch Querauflösung nennt. Längs 180 Zeilen auf den Zoll; quer aus der Scanbreite erschlossen und vom gemessenen Spurabstand bestätigt: 203,6 dpi gegen die 204, die Chases eigene Software in ihre Dateien schrieb.`,

            `Überführt mit cis2roll.py in ein TIFF von 300 dpi, gelesen mit tiff2holes -l auf der Licensee-Leiste. Deren Nummerierung sitzt zwölf Stellen unter der Spaltenzählung des Parsers; die Rückspulperforation auf Spur 89 legt den Versatz fest.`,

            `Das Gerät ist nicht überliefert, seine Bauart aus der Datei ablesbar: Chase-Transport mit Capstan-Antrieb, ohne Positionsgeber, aus der Generation vor dem Mk3.`,

            `Zuvor stand hier Chases eigene Lochliste W225E.bar mit W225E.ann, deren Raster von 400 Zeilen auf den Zoll aus den 180 des Scans interpoliert war. Beide Lesungen stimmen auf 953 von 955 Löchern überein, im Mittel auf 0,000 mm, im Rest auf 0,06 mm.`,

            `Ein Vorbehalt bleibt, ein anderer fällt fort: Stanzorte liegen jetzt so genau wie der Scan, doch liest dieser quer zur Rolle 0,012 Zoll zu breit, so dass Lochbreiten auf diesem Exemplar nicht als Befund taugen.`
        ]
    },
    {
        path: 'copies/4/readFrom',
        startsWith: 'Optische Abtastung durch Julian Dyer',
        after: [
            `Optische Abtastung durch Julian Dyer aus der Sammlung Peter Both. Die CIS-Datei kam am 8. September 2026 per Mail, überführt mit cis2roll.py in ein lesbares TIFF, analysiert mit dem roll-image-parser von SUPRA.`,

            `Rückspulbefehl: eine 499 mm lange Perforation auf der Bassspur 1, zugleich die Sforzando-piano-Position, beginnend bei 10324,6 mm der Editionsachse. Dahinter ein treppenförmiges Prüfmuster über alle 98 Spuren, 361 Perforationen, die zum Scanner gehören und nicht auf das Papier.`
        ]
    },
    {
        path: 'copies/5/readFrom',
        startsWith: 'Bekannt ist dieses Exemplar allein aus der Einspielung von TACET',
        after: [
            `Bekannt allein aus der Einspielung von TACET, The Welte Mignon Mystery, Vol. XXI (TACET 220, 2016), hier nach der YouTube-Veröffentlichung von Naxos of America (Video Myn21YML3P0). Das Exemplar bei Hans-W. Schmitz.`,

            `Von welcher Rolle kopiert, ist nicht bekannt; auf welchem Instrument in welcher Regulierung gespielt, nennt die Veröffentlichung nicht.`,

            `Töne zweimal transkribiert, mit dem Verfahren von Kong et al. (2021) und mit Transkun (Yan und Duan 2024). Der Vergleich mit den Fassungen stützt sich auf das Mittel von vier standardisierten Lautstärkemaßen: die Anschlagstärken beider Transkriptionen und die Lautstärke aus einer NMF-Zerlegung nach Ewert und Müller (2012), am Obertonmaximum und am Anschlag.`,

            `Transkriptionen und Auswertungen: https://github.com/pfefferniels/welte225.org/blob/f2b1477/schmitz-225/.`
        ]
    },
    {
        path: 'copies/6/readFrom',
        startsWith: 'Die e-Roll-Datei ist die unbearbeitete Ausgabe',
        after: [
            `Die e-Roll-Datei ist die unbearbeitete Ausgabe von Phillips' pneumatischem Rollenleser: jede Spur schreibt beim Durchlauf ihrer Perforation einen MIDI-Ton, alle mit derselben Anschlagstärke. Nummern nach seiner Regel: ein Ton trägt die MIDI-Nummer seiner Tonhöhe, eine Ausdrucksspur ihre Position auf der Licensee-Leiste plus 15.`,

            `Zeiten über die Töne auf die Achse der Edition gelegt: 461 der 464 Töne als Tonfolge an ${R4} ausgerichtet; eine Parabel nimmt den Aufwickelzug auf, ein gleitender Median über dreizehn Töne die örtlichen Dehnungen des umgestanzten Papiers, von dem die Töne um 0,56 mm (Median) abweichen.`,

            `Ausdrucksstanzungen liegen danach im Median 1,2 mm hinter ihren Symbolen und streuen mit 0,9 mm (Median) und 3,2 mm (95 %). Ein Schalter bleibt länger offen, als die Perforation lang ist; Enden liegen hier daher später.`,

            `Spur 8, das An des Pianozugs, kommt in der ganzen Datei nicht vor; ob der Leser diese Spur liest, ist nicht bekannt. Phillips' Standard-MIDI-Datei desselben Exemplars ist dieselbe Lesung, um 1274 Ticks versetzt.`
        ]
    },
    {
        path: 'copies/7/readFrom',
        startsWith: 'Bekannt ist dieses Exemplar allein aus Warren Trachtmans',
        after: [
            `Bekannt allein aus Warren Trachtmans emulierter MIDI-Datei, öffentlich unter pianorollmusic.org. Ihr Kopf nennt Rollennummer C-225, Tempo 75, Echtheit „Original“ und Philippe Gourlin als Eigentümer; anderweitig belegen lassen sich diese Angaben nicht.`,

            `Trachtman hat die Rolle mit 300 Zeilen auf den Zoll gescannt, am 17. März 2007 in eine e-Roll-Datei umgewandelt und deren Ausdruck emuliert. Die Datei enthält daher Töne mit Anschlagstärken und das Dämpferpedal, keine Ausdrucksstanzungen; für den Pianozug schreibt die Emulation kein Signal.`
        ]
    },
    {
        path: 'copies/8/readFrom',
        startsWith: 'Bekannt ist dieses Exemplar allein aus der Einspielung in Legendary Masters',
        after: [
            `Bekannt allein aus der Einspielung in Legendary Masters of the Piano (The Classics Record Library, 1963, Katalognummer WV 6633), LP 1, Seite 2, Nr. 2, hier nach der Überspielung, die David Hertzberg 2022 auf YouTube unter der Nummer SWV 6633 veröffentlicht hat.`,

            `Nach der Abschrift der Plattentasche auf mmdigest.com wurde die Kassette von Richard C. Simonton für den Book-of-the-Month Club hergestellt, von Walter S. Heebner produziert und „in Los Angeles, California, winter 1962-1963, on Steinway Concert Grand No. 261“ aufgenommen.`,

            `Simontons Welte-Rollen liegen heute in den USC Libraries; deren Verzeichnis (2000) führt Nr. 0225 in drei Exemplaren, keines als Rolle der amerikanischen Tochtergesellschaft vermerkt. Welches gespielt wurde, ist nicht bekannt.`,

            `Töne und Timing folgen den roten Exemplaren: die Neuanschläge von ${L1} sind nicht zu hören; das e′′ bei 6611,5 mm, das ${L1} überbindet, erklingt; an den beiden Stellen, an denen die Licensee-Exemplare rund 27 mm länger laufen, weicht die Aufnahme um höchstens 0,2 mm ab, bei einer Streuung aller gleich langen Strecken von 1,4 mm.`,

            `Die Überspielung klingt gleichbleibend 19 Cent zu hoch, durch Geschwindigkeit oder Stimmung. Transkribiert wurde die Monosumme nach Korrektur der Tonhöhe, mit Transkun (Yan und Duan 2024) und dem Verfahren von Kong et al. (2021); dessen Transkription enthält viele Fehltöne und ist daher mit der Zeitzuordnung von Transkun gepaart. Die Lautstärke der Töne ist aus beiden Transkriptionen und aus einer NMF-Zerlegung nach Ewert und Müller (2012) geschätzt.`,

            `Transkriptionen und Auswertungen: https://github.com/pfefferniels/welte225.org/blob/df38575/simonton-225/.`
        ]
    },
    {
        path: 'versions/0/edits/9/@annotation/belief/reasons/0',
        startsWith: 'Das zweite An bei 7364,7 mm trägt allein St1',
        after: [
            `Das zweite An bei 7364,7 mm allein in St1, im Crescendo von 7348 bis 7396 mm und dort wirkungslos. Ein An nach einem An ist die Spur einer Verschiebung: das An stand zuerst bei 7364,7 mm, wurde auf 7348 mm vorgezogen, die alte Stanzung blieb stehen; ${R3} tilgt sie. Die Öffnung misst auf St1 7,2 mm gegen im Median 5,1 mm bei den Crescendo-Öffnungen im Bass, was eine eigene Stanzung dieses Exemplars nicht ausschließt.`
        ]
    },
    {
        path: 'versions/0/edits/17/@annotation/belief/reasons/0',
        startsWith: 'Das An des Pianozugs bei 6250,4 mm trägt allein Wi1',
        after: [
            `Das An des Pianozugs bei 6250,4 mm allein in Wi1. Ohne es stünde schon in ${R1} bei 6338,5 mm ein zweites Ab ohne Wirkung, wie St1 und St2 es tragen. Eine spätere Einfügung, die eine bestehende Redundanz nachträglich erklärt, ist unwahrscheinlich. Also steht das An in ${R1}; ${R2} hat es getilgt und das Ab stehen lassen.`
        ]
    },
    {
        path: 'versions/2/edits/65/@annotation/belief/reasons/0',
        startsWith: 'Diese Befehle bei 1691–1775, 2582, 2608 und 7444–8037 mm fehlen in St2',
        after: [
            `Diese Befehle bei 1691–1775, 2582, 2608 und 7444–8037 mm fehlen in St2, dem Zeugen dieser Fassung, ebenso in der Licensee- und in der grünen Umstanzung; getragen allein von St1 und Wi1. Vier von ihnen werden erst durch Bearbeitungen von ${R2} wirkungslos, zwei sind es schon in ${R1}.`
        ]
    },
    {
        path: 'versions/4/edits/4/insert/0/alignedWith/@annotation/belief/reasons/0',
        startsWith: 'Bezieht sich das Forzando ab nicht auf die zwei',
        after: [
            `Bezöge sich das Forzando ab nicht auf die zwei unmittelbar folgenden Noten, hätte das vorlaufende Crescendo keinen Sinn.`
        ]
    },
    {
        path: 'versions/4/edits/7/@annotation/belief/reasons/0',
        startsWith: 'Das Loslassen bei 5370,8 mm fehlt allein auf Wi1',
        after: [
            `Das Loslassen bei 5370,8 mm fehlt allein auf Wi1; es steht auf St1, St2, Ch1 und Ph1, und Bo1 hält das Pedal genau bis dorthin. Wäre es eine Zutat von ${R2}, machte diese Zutat eine in ${R1} bereits stehende Redundanz sinnvoll, was Bearbeitungen nicht tun. Also steht es in ${R1}, und dieses Exemplar hat es verloren.`
        ]
    },
    {
        path: 'versions/4/edits/8/@annotation/belief/reasons/0',
        startsWith: 'Die rasch wechselnden Stanzungen des Pianozugs in T. 9',
        after: [
            `Die rasch wechselnden Stanzungen des Pianozugs in T. 9 trägt allein Wi1. Keine Kopie zeigt hier eine Redundanz, die sie erklären müsste, und spätere Fassungen fügen in der Regel Nuancen hinzu; sie gelten daher als Zusatz dieser Fassung, die dafür Beginn und Ende der schlichten Aufhebung aus ${R1} verlegt.`,

            `Denkbar bleibt, dass sie schon in ${R1} standen und ${R2} sie tilgte, etwa weil der schnelle Wechsel störende Geräusche verursachte; dann nähme ${R2} vier wirksame Stanzungen zurück und verlegte zwei.`
        ]
    },
    {
        path: 'versions/8/edits/5/@annotation/belief/reasons/0',
        startsWith: 'Eine Stanzung dieser Bearbeitung liegt, wo',
        after: againstR2('1986,7'),
        mayDrop: weighedInDerivation
    },
    {
        path: 'versions/8/edits/22/@annotation/belief/reasons/0',
        startsWith: 'Die Stanzung liegt, wo',
        after: againstR2('2872,9'),
        mayDrop: weighedInDerivation
    },
    {
        path: 'versions/8/edits/35/@annotation/belief/reasons/0',
        startsWith: 'Die Stanzung liegt, wo',
        after: againstR2('4055,7'),
        mayDrop: weighedInDerivation
    },
    {
        path: 'versions/8/edits/48/@annotation/belief/reasons/0',
        startsWith: 'Die Stanzung liegt, wo',
        after: againstR2('5582,7'),
        mayDrop: weighedInDerivation
    },
    {
        path: 'versions/8/edits/46/@annotation/belief/reasons/0',
        startsWith: 'Die Lesung zeigt keine der Ab-Stanzungen des Pianozugs',
        after: [
            `Die Lesung zeigt keine Ab-Stanzung des Pianozugs, obwohl der Schalter von Spur 7 in der Löschreihe und nach dem letzten Ton anspricht. Das An auf Spur 8 kommt in der ganzen Datei nicht vor; ob Phillips' Leser diese Spur liest, ist nicht bekannt, daher bleibt das Entfallen der An-Stanzungen offen. Die Anschlagstärken in Trachtmans Emulation von Gourlins Exemplar zeigen in T. 8′ bis 15 keine Änderung durch den Pianozug.`
        ]
    }
]

/**
 * What is fixed wherever a note says it: the stemmatic term for what
 * four notes called a mixing, a typo, the collector's name as the rest
 * of the edition spells it, and the octave mark as a prime.
 *
 * Then the vocabulary of the soft pedal, settled against the
 * dissertation, which writes "das Una Corda-Pedal gedrückt" for the
 * device and "ein graduelles Aufheben der Verschiebung" for its effect.
 * The edition used Verschiebung for both that effect and for a punching
 * being moved; the second sense gives way to Verlegung, which the
 * edition already uses in one place.
 *
 * `times` is what the phrase is expected to occur, so that a phrase that
 * has moved is reported rather than silently missed.
 */
const TERMS: readonly { before: string, after: string, times: number }[] = [
    { before: 'Vermischung', after: 'Kontamination', times: 4 },
    { before: 'innheralb', after: 'innerhalb', times: 1 },
    { before: 'Dennis Condon', after: 'Denis Condon', times: 1 },
    { before: "Akzent auf f'", after: 'Akzent auf f′', times: 1 },

    { before: 'des Pianozugs', after: 'des Una Corda-Pedals', times: 7 },
    { before: 'durch den Pianozug', after: 'durch das Una Corda-Pedal', times: 3 },
    { before: 'für den Pianozug', after: 'für das Una Corda-Pedal', times: 1 },
    { before: 'die Pedale, Pianozug und', after: 'die Pedale, das Una Corda-Pedal und', times: 1 },
    { before: 'des Leisepedals', after: 'des Una Corda-Pedals', times: 1 },
    { before: 'Für die Una corda in T. 13', after: 'Für die Verschiebung in T. 13', times: 1 },

    { before: 'die Spur einer Verschiebung', after: 'die Spur einer Verlegung', times: 1 },
    { before: 'die Verschiebung des c′', after: 'die Verlegung des c′', times: 1 },
    { before: 'Verschiebung auf betonte Zeit', after: 'Verlegung auf betonte Zeit', times: 1 },
    { before: 'verschiebt oder tilgt', after: 'verlegt oder tilgt', times: 3 },
    { before: 'verschoben oder getilgt hat', after: 'verlegt oder getilgt hat', times: 4 },
    { before: 'gleichartig, also verschoben', after: 'gleichartig, also verlegt', times: 1 },
    { before: 'ein verschobenes g', after: 'ein verlegtes g', times: 1 }
]

/** Every number a note gives, which a rewording has to carry over. */
const figuresIn = (note: string): string[] => note.replace(/\{\{[^}]+\}\}/g, ' ').match(/\d+(?:[,.]\d+)?/g) ?? []

/** The versions a note refers to. Dropping one would cost the reader a link. */
const referencesIn = (note: string): string[] => [...new Set(note.match(/\{\{[^}]+\}\}/g) ?? [])]

const noteAt = (document: Json, path: string): Json | undefined =>
    path.split('/').reduce<Json | undefined>((node, step) => node?.[step], document)

/**
 * The note as it reads, so that a rewording counts as done although
 * perforation links have been laid into it since.
 */
const asRead = (note: string) => note.replace(/\{\{[^}|]+\|([^}]*)\}\}/g, '$1')

const document = readEdition()
const report: string[] = []
const problems: string[] = []

REWORDINGS.forEach(({ path, startsWith, after, mayDrop = [] }) => {
    const reason = noteAt(document, path)
    const note: string | undefined = reason?.note
    const text = after.join('\n\n')

    if (!reason || note === undefined) return problems.push(`${path} trägt keine Notiz`)
    if (asRead(note) === asRead(text)) return report.push(`${path} ist schon umformuliert`)
    if (!note.startsWith(startsWith)) return problems.push(`${path} beginnt nicht wie erwartet`)

    const lost = figuresIn(note).filter(figure => !figuresIn(text).includes(figure) && !mayDrop.includes(figure))
    if (lost.length > 0) return problems.push(`${path} verlöre die Zahlen ${lost.join(', ')}`)

    const unlinked = referencesIn(note).filter(reference => !text.includes(reference))
    if (unlinked.length > 0) return problems.push(`${path} verlöre ${unlinked.length} Verweis(e)`)

    reason.note = text
    report.push(`${path}: ${note.length} → ${text.length} Zeichen, ${after.length} Absätze`)
})

/** Replaces a term wherever a note uses it, and says how often. */
const replaceTerm = (node: unknown, before: string, after: string): number => {
    if (Array.isArray(node)) return node.reduce((sum, item) => sum + replaceTerm(item, before, after), 0)
    if (node === null || typeof node !== 'object') return 0

    return Object.entries(node as Json).reduce((sum, [key, value]) => {
        if (key !== 'note' || typeof value !== 'string' || !value.includes(before)) {
            return sum + replaceTerm(value, before, after)
        }
        (node as Json)[key] = value.replaceAll(before, after)
        return sum + value.split(before).length - 1
    }, 0)
}

TERMS.forEach(({ before, after, times }) => {
    const count = replaceTerm(document, before, after)
    if (count === 0) return report.push(`„${before}“ steht nicht mehr da, schon ersetzt`)
    if (count !== times) problems.push(`„${before}“ steht ${count}-mal da, erwartet waren ${times}`)
    report.push(`„${before}“ → „${after}“: ${count} Stellen`)
})

finish(document, report, [...problems, ...structuralProblems(document)])
