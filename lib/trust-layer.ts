import { REAL_CASE_STUDIES } from '@/lib/real-case-studies'

export type TrustFaqItem = {
  question: string
  answer: string
}

export type TrustSignalItem = {
  title: string
  copy: string
  href?: string
  cta?: string
}

export const FAQ_SHORTLISTS = {
  home: [
    {
      question: 'Czym jest 15-minutowa konsultacja behawioralna?',
      answer:
        'To 15 minut rozmowy audio bez kamery. MĂłwisz, co naprawdÄ™ siÄ™ dzieje, ustalamy priorytet i wybieramy pierwszy konkretny krok.',
    },
    {
      question: 'Czy Kwadrans wystarczy?',
      answer:
        'Przy jednym pytaniu albo przy pierwszym uporzÄ…dkowaniu tematu czÄ™sto tak. Przy sprawie zĹ‚oĹĽonej pomaga zdecydowaÄ‡, czy potrzebujesz szerszej konsultacji.',
    },
    {
      question: 'Czy peĹ‚na konsultacja online ma sens?',
      answer:
        'Tak. Przy wielu problemach waĹĽne sÄ… historia, Ĺ›rodowisko i codzienny rytm, a nie tylko sam objaw.',
    },
    {
      question: 'Czy mogÄ™ najpierw napisaÄ‡?',
      answer:
        'Tak. KrĂłtka wiadomoĹ›Ä‡ pomaga doprecyzowaÄ‡ sytuacjÄ™, jeĹ›li nie chcesz rezerwowaÄ‡ od razu.',
    },
  ] satisfies TrustFaqItem[],
  dogs: [
    {
      question: 'Czy pomoc jest tylko dla bardzo trudnych przypadkĂłw?',
      answer:
        'Nie. Wiele osĂłb zgĹ‚asza siÄ™ wtedy, gdy chce zrozumieÄ‡ sytuacjÄ™ i wybraÄ‡ spokojny pierwszy krok, zanim problem uroĹ›nie.',
    },
    {
      question: 'Czy konsultacja online ma sens przy spacerach albo reaktywnoĹ›ci?',
      answer:
        'Tak. W wielu psich tematach wystarcza, ĹĽeby uporzÄ…dkowaÄ‡ wyzwalacze, prĂłg reakcji i pierwszy plan dziaĹ‚ania.',
    },
    {
      question: 'Co jeĹ›li byĹ‚em u trenera, a problem wraca?',
      answer:
        'To czÄ™sty sygnaĹ‚, ĹĽe pod spodem jest temat emocji, pobudzenia albo Ĺ›rodowiska. Wtedy konsultacja behawioralna daje lepszy punkt startu.',
    },
    {
      question: 'Kiedy warto zgĹ‚osiÄ‡ siÄ™ po pomoc?',
      answer:
        'Wtedy, gdy temat wraca, obciÄ…ĹĽa codziennoĹ›Ä‡ albo kolejne prĂłby nic nie zmieniajÄ…. Nie trzeba czekaÄ‡, aĹĽ zrobi siÄ™ naprawdÄ™ Ĺşle.',
    },
    {
      question: 'Czy warto zgĹ‚osiÄ‡ siÄ™, jeĹ›li trudnoĹ›Ä‡ dopiero zaczyna siÄ™ u psa?',
      answer: 'Tak. Im wczeĹ›niej zĹ‚apiemy schemat, tym Ĺ‚atwiej zatrzymaÄ‡ jego utrwalanie.',
    },
    {
      question: 'Czy pomagasz przy rozĹ‚Ä…ce i trudnym zostawaniu samemu?',
      answer:
        'Tak. W takich sytuacjach szczegĂłlnie waĹĽny jest spokojny plan pierwszych krokĂłw i tempo dopasowane do psa.',
    },
    {
      question: 'Czy konsultacja ma sens, jeĹ›li pies jest stale pobudzony i trudno mu siÄ™ wyciszyÄ‡?',
      answer:
        'Tak. Sprawdzamy rytm dnia, obciÄ…ĹĽenie i to, co pomaga wracaÄ‡ do rĂłwnowagi bez dokĹ‚adania presji.',
    },
    {
      question: 'Co jeĹ›li pies ma kilka trudnoĹ›ci naraz?',
      answer: 'To bardzo czÄ™ste. Najpierw wybieramy temat, od ktĂłrego warto zaczÄ…Ä‡, ĹĽeby reszta teĹĽ mogĹ‚a siÄ™ uporzÄ…dkowaÄ‡.',
    },
  ] satisfies TrustFaqItem[],
  cats: [
    {
      question: 'Czy konsultacja ma sens, jeĹ›li widzÄ™ tylko subtelne zmiany w zachowaniu kota?',
      answer:
        'Tak. Przy kotach wĹ‚aĹ›nie drobne sygnaĹ‚y czÄ™sto najwiÄ™cej mĂłwiÄ… o napiÄ™ciu, bĂłlu albo zmianie w Ĺ›rodowisku.',
    },
    {
      question: 'Czy konsultacja online ma sens przy kuwecie, stresie albo wycofaniu?',
      answer:
        'Tak. W wielu kocich sprawach online w peĹ‚ni wystarcza, ĹĽeby uporzÄ…dkowaÄ‡ Ĺ›rodowisko, relacje i pierwszy kierunek dziaĹ‚ania.',
    },
    {
      question: 'Czy muszÄ™ juĹĽ wiedzieÄ‡, czy problem dotyczy kuwety, stresu czy relacji?',
      answer:
        'Nie. Konsultacja jest po to, ĹĽeby oddzieliÄ‡ objaw od tĹ‚a i ustaliÄ‡, co dziĹ› naprawdÄ™ wymaga uwagi.',
    },
    {
      question: 'Kiedy najpierw weterynarz?',
      answer:
        'Przy nagĹ‚ej zmianie zachowania, szczegĂłlnie u kota. Najpierw wykluczamy tĹ‚o zdrowotne, potem dokĹ‚adamy warstwÄ™ behawioralnÄ….',
    },
    {
      question: 'Czy konsultacja ma sens, jeĹ›li kot staĹ‚ siÄ™ bardziej wycofany, czujny albo napiÄ™ty?',
      answer: 'Tak. To sygnaĹ‚y, ktĂłre warto uporzÄ…dkowaÄ‡ wczeĹ›nie, zanim stanÄ… siÄ™ nowÄ… codziennoĹ›ciÄ….',
    },
    {
      question: 'Czy pomagasz przy napiÄ™ciu miÄ™dzy kotami?',
      answer: 'Tak. W takich sytuacjach liczÄ… siÄ™ bezpieczeĹ„stwo, przestrzeĹ„ i dobra kolejnoĹ›Ä‡ zmian.',
    },
    {
      question: 'Co jeĹ›li zachowanie kota zmieniĹ‚o siÄ™ po przeprowadzce, nowym domowniku albo zmianie rytmu dnia?',
      answer: 'To czÄ™sty scenariusz. Takie zmiany potrafiÄ… mocno wpĹ‚ynÄ…Ä‡ na kota, nawet jeĹ›li z zewnÄ…trz wyglÄ…dajÄ… niewinnie.',
    },
    {
      question: 'Czy konsultacja jest tylko dla powaĹĽnych problemĂłw kota?',
      answer: 'Nie. CzÄ™sto warto odezwaÄ‡ siÄ™ wĹ‚aĹ›nie wtedy, gdy widzisz, ĹĽe coĹ› zaczyna iĹ›Ä‡ w zĹ‚Ä… stronÄ™.',
    },
  ] satisfies TrustFaqItem[],
  contact: [
    {
      question: 'Kiedy wybraÄ‡ krĂłtkÄ… wiadomoĹ›Ä‡?',
      answer:
        'Gdy nie chcesz rezerwowaÄ‡ od razu albo chcesz krĂłtko doprecyzowaÄ‡ temat.',
    },
    {
      question: 'Czy krĂłtka wiadomoĹ›Ä‡ zastÄ™puje konsultacjÄ™?',
      answer:
        'Nie. To krĂłtka wiadomoĹ›Ä‡, po ktĂłrej wskaĹĽÄ™, czy lepsza bÄ™dzie 15-minutowa konsultacja behawioralna, peĹ‚na konsultacja czy jeszcze samo doprecyzowanie tematu.',
    },
    {
      question: 'Czy 15-minutowa konsultacja behawioralna wymaga kamery?',
      answer: 'Nie. To rozmowa audio bez kamery, przeznaczona do krĂłtkiego omĂłwienia sprawy przed dalszÄ… decyzjÄ….',
    },
    {
      question: 'Czy mogÄ™ ustaliÄ‡ inny format, jeĹ›li rozmowa gĹ‚osowa jest dla mnie trudna?',
      answer:
        'Tak. Napisz przez formularz i opisz ograniczenie. Ustalimy, czy da siÄ™ bezpiecznie przygotowaÄ‡ inny wariant kontaktu.',
    },
  ] satisfies TrustFaqItem[],
  pricing: [
    {
      question: 'Czym jest 15-minutowa konsultacja behawioralna?',
      answer:
        'To samodzielny format: 15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
    },
    {
      question: 'Czy Kwadrans to prĂłbna konsultacja?',
      answer:
        'Nie. To osobna usĹ‚uga z wĹ‚asnym zastosowaniem. Dla wielu osĂłb ten format w peĹ‚ni wystarcza na start.',
    },
    {
      question: 'Kiedy wybraÄ‡ peĹ‚nÄ… konsultacjÄ™ zamiast Kwadransu?',
      answer:
        'Gdy problem trwa dĹ‚uĹĽej, ma kilka wÄ…tkĂłw albo od razu wiesz, ĹĽe potrzebujesz okoĹ‚o 2h online, analizy zachowania, planu i 14 dni komunikacji w pokoju klienta.',
    },
    {
      question: 'Co dostajÄ™ po peĹ‚nej konsultacji?',
      answer:
        'AnalizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    },
    {
      question: 'Czy mogÄ™ od razu wejĹ›Ä‡ w peĹ‚nÄ… konsultacjÄ™?',
      answer: 'Tak. Nie ma obowiÄ…zku zaczynania od Kwadransu, jeĹ›li wiesz, ĹĽe temat wymaga szerszej pracy.',
    },
  ] satisfies TrustFaqItem[],
  consultation: [
    {
      question: 'Kiedy to jest dobry moment, ĹĽeby siÄ™ odezwaÄ‡?',
      answer:
        'Gdy coĹ› wraca, nasila siÄ™ albo zaczyna ustawiaÄ‡ codziennoĹ›Ä‡ w domu. Nie trzeba czekaÄ‡, aĹĽ zrobi siÄ™ naprawdÄ™ trudno.',
    },
    {
      question: 'Czy mogÄ™ napisaÄ‡, jeĹ›li nie umiem dobrze nazwaÄ‡ problemu?',
      answer:
        'Tak. Wystarczy zwykĹ‚y opis tego, co widzisz na co dzieĹ„. NazwÄ™ i porzÄ…dek moĹĽemy ustaliÄ‡ pĂłĹşniej.',
    },
    {
      question: 'Jak wyglÄ…da pierwsza konsultacja?',
      answer:
        'Najpierw porzÄ…dkujemy sytuacjÄ™, potem patrzymy na tĹ‚o i codziennoĹ›Ä‡, a na koĹ„cu wybieramy pierwszy krok.',
    },
    {
      question: 'Co dostanÄ™ po konsultacji?',
      answer: 'Jasny kierunek, priorytet i pierwszy plan, ktĂłry da siÄ™ realnie wdroĹĽyÄ‡.',
    },
    {
      question: 'Czy konsultacja online ma sens?',
      answer:
        'Tak. Przy wiÄ™kszoĹ›ci problemĂłw behawioralnych online nie jest kompromisem, bo najwaĹĽniejsze sÄ… historia, Ĺ›rodowisko i kontekst.',
    },
    {
      question: 'Czy muszÄ™ mieÄ‡ kamerÄ™ albo nagranie?',
      answer:
        'Nie. Kamera jest opcjonalna, a nagranie bywa pomocne, ale nie jest warunkiem rozpoczÄ™cia rozmowy.',
    },
    {
      question: 'Czy pies albo kot musi byÄ‡ przy mnie podczas konsultacji?',
      answer:
        'Nie musi. PracujÄ™ na tym, co opisujesz. JeĹ›li zwierzÄ™ jest obok i coĹ› pokazuje, to tylko dodatkowy kontekst.',
    },
    {
      question: 'Co jeĹ›li temat okaĹĽe siÄ™ poza zakresem?',
      answer:
        'Powiem to wprost i skierujÄ™ CiÄ™ do odpowiedniego specjalisty. Nie zatrzymujÄ™ CiÄ™ w formacie, ktĂłry nie wystarczy.',
    },
  ] satisfies TrustFaqItem[],
  dogBehaviorist: [
    {
      question: 'Czy Kwadrans ma sens przy psie, jeĹ›li nie umiem nazwaÄ‡ problemu?',
      answer:
        'Tak. Wystarczy opis tego, co widzisz. Pomagam nazwaÄ‡ temat, oceniÄ‡ priorytet i wybraÄ‡ wĹ‚aĹ›ciwy pierwszy ruch.',
    },
    {
      question: 'Czy pomoc behawiorysty ma sens po nieudanym treningu?',
      answer:
        'Tak. Trening nie zawsze siÄ™ga tego, co napÄ™dza zachowanie. Przy lÄ™ku, reaktywnoĹ›ci albo pobudzeniu trzeba najpierw zrozumieÄ‡ tĹ‚o.',
    },
    {
      question: 'Czy przy problemie psa online wystarczy?',
      answer:
        'Bardzo czÄ™sto tak. WyjÄ…tki sÄ… jasne i jeĹ›li TwĂłj przypadek do nich naleĹĽy, powiem o tym od razu.',
    },
    {
      question: 'Z czym najczÄ™Ĺ›ciej zgĹ‚aszajÄ… siÄ™ opiekunowie psĂłw?',
      answer:
        'NajczÄ™Ĺ›ciej ze spacerami, reaktywnoĹ›ciÄ…, rozĹ‚Ä…kÄ…, pobudzeniem w domu albo trudnym startem po adopcji.',
    },
  ] satisfies TrustFaqItem[],
  catBehaviorist: [
    {
      question: 'Czy Kwadrans ma sens przy problemie kota?',
      answer:
        'Tak. To dobry format, gdy chcesz ustaliÄ‡, czy temat jest behawioralnay, Ĺ›rodowiskowy czy wymaga najpierw weterynarza.',
    },
    {
      question: 'Czy kaĹĽda zmiana zachowania kota jest behawioralna?',
      answer:
        'Nie. Przy nagĹ‚ych zmianach pierwszym krokiem bywa weterynarz. To element bezpiecznej analizy zachowania, nie przeszkoda.',
    },
    {
      question: 'Czy online wystarczy przy kuwecie albo konflikcie miÄ™dzy kotami?',
      answer:
        'W wielu przypadkach tak, bo kluczowe sÄ… Ĺ›rodowisko, zasoby, historia zmian i relacje w domu.',
    },
    {
      question: 'Z czym najczÄ™Ĺ›ciej zgĹ‚aszajÄ… siÄ™ opiekunowie kotĂłw?',
      answer:
        'NajczÄ™Ĺ›ciej z kuwetÄ…, stresem Ĺ›rodowiskowym, wycofaniem, nagĹ‚Ä… zmianÄ… zachowania i napiÄ™ciem miÄ™dzy kotami.',
    },
  ] satisfies TrustFaqItem[],
  toolkit: [
    {
      question: 'Czy materiaĹ‚y PDF zastÄ™pujÄ… konsultacjÄ™?',
      answer:
        'Nie. To uporzÄ…dkowany hub materiaĹ‚Ăłw do samodzielnej pracy. JeĹ›li temat jest mieszany albo wraca, rozmowa zwykle daje lepszy start.',
    },
    {
      question: 'Od czego zaczÄ…Ä‡ w materiaĹ‚ach PDF?',
      answer:
        'Od jednego materiaĹ‚u najbliĹĽszego Twojej sytuacji. JeĹ›li po przejrzeniu nadal nie wiesz, co wybraÄ‡, napisz krĂłtkÄ… wiadomoĹ›Ä‡.',
    },
    {
      question: 'Czy materiaĹ‚y sÄ… tylko dla osĂłb przed konsultacjÄ…?',
      answer:
        'Nie. W materiaĹ‚ach PDF sÄ… materiaĹ‚y startowe, wĹ‚asne przewodniki i materiaĹ‚y uzupeĹ‚niajÄ…ce do dalszej pracy.',
    },
    {
      question: 'Czy po materiale warto wrĂłciÄ‡ do rozmowy?',
      answer:
        'Tak, jeĹ›li temat wymaga dopasowania do Twojej sytuacji albo widzisz, ĹĽe sam materiaĹ‚ nie wystarcza do uporzÄ…dkowania problemu.',
    },
  ] satisfies TrustFaqItem[],
  opinions: [
    {
      question: 'Czy opinie sÄ… anonimowe?',
      answer: 'Tak. PokazujÄ™ tylko tyle, ile wystarczy, ĹĽeby zachowaÄ‡ kontekst bez odsĹ‚aniania danych wraĹĽliwych.',
    },
    {
      question: 'Czy opinie pokazujÄ… realne sytuacjÄ™?',
      answer:
        'Tak. To krĂłtkie gĹ‚osy po konsultacjach i przykĹ‚adowe opisy sytuacji, w ktĂłrych byĹ‚o wiadomo, od czego zaczÄ…Ä‡.',
    },
    {
      question: 'Czego moĹĽna siÄ™ po nich spodziewaÄ‡?',
      answer:
        'Raczej tonu rozmowy, sposobu tĹ‚umaczenia i tego, co pomaga uporzÄ…dkowaÄ‡ temat na starcie.',
    },
    {
      question: 'Czy po przeczytaniu opinii nadal mogÄ™ napisaÄ‡ krĂłtkÄ… wiadomoĹ›Ä‡?',
      answer:
        'Tak. JeĹ›li nie chcesz od razu wybieraÄ‡ terminu, moĹĽesz zaczÄ…Ä‡ od krĂłtkiej wiadomoĹ›ci.',
    },
  ] satisfies TrustFaqItem[],
} as const

export const TRUST_SIGNAL_SETS = {
  contact: [
    {
      title: 'Jasny zakres kontaktu',
      copy: 'KrĂłtka wiadomoĹ›Ä‡ ma doprecyzowaÄ‡ sytuacjÄ™, a nie zamieniÄ‡ siÄ™ w dĹ‚ugÄ… korespondencjÄ™ przed rozmowÄ….',
    },
    {
      title: 'Szczera rekomendacja',
      copy: 'JeĹ›li temat wymaga od razu Kwadransu z behawiorystÄ… albo peĹ‚nej konsultacji, mĂłwiÄ™ to wprost.',
    },
    {
      title: 'WiÄ™cej o mnie',
      copy: 'Na stronie o mnie sÄ… krĂłtko opisane kwalifikacje, publikacje i sposĂłb pracy.',
      href: '/o-mnie',
      cta: 'Zobacz stronÄ™ o mnie',
    },
  ] satisfies TrustSignalItem[],
  pricing: [
    {
      title: 'Dwa formaty, nie lepszy i gorszy',
      copy: 'Kwadrans, Dwa kwadranse i PeĹ‚na konsultacja rozwiÄ…zujÄ… rĂłĹĽne potrzeby. WybĂłr zaleĹĽy od zĹ‚oĹĽonoĹ›ci tematu.',
    },
    {
      title: 'Bez kamery, jeĹ›li nie chcesz',
      copy: 'Kwadrans jest zawsze rozmowÄ… gĹ‚osowÄ…. Przy peĹ‚nej konsultacji kamera pozostaje opcjonalna.',
    },
    {
      title: 'Bez obietnic na zapas',
      copy: 'Nie obiecujÄ™ efektĂłw po jednej rozmowie. ObiecujÄ™ uczciwe ustawienie priorytetu i pierwszego sensownego planu.',
    },
  ] satisfies TrustSignalItem[],
  consultation: [
    {
      title: 'Analiza zachowania przed technikÄ…',
      copy: 'Konsultacja zaczyna siÄ™ od tego, co napÄ™dza zachowanie, a nie od dopisywania gotowej metody.',
    },
    {
      title: 'Zakres mĂłwiony wprost',
      copy: 'JeĹ›li temat wymaga innego specjalisty albo formatu stacjonarnego, komunikujÄ™ to jasno.',
    },
    {
      title: 'Podsumowanie po peĹ‚nej konsultacji',
      copy: 'Po peĹ‚nej konsultacji dostajesz plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    },
  ] satisfies TrustSignalItem[],
  toolkit: [
    {
      title: 'MateriaĹ‚y jako wsparcie, nie zamiennik rozmowy',
      copy: 'MateriaĹ‚y PDF majÄ… porzÄ…dkowaÄ‡ temat i dawaÄ‡ punkt startu. Gdy sytuacja jest wielowÄ…tkowa, lepiej przejĹ›Ä‡ do rozmowy.',
    },
    {
      title: 'Selekcja zamiast katalogu wszystkiego',
      copy: 'KaĹĽda pozycja jest tu dlatego, ĹĽe przydaje siÄ™ w konkretnej sytuacji, a nie dlatego, ĹĽe wypeĹ‚nia pĂłĹ‚kÄ™.',
    },
    {
      title: 'Spokojny next step',
      copy: 'Po materiale moĹĽesz wrĂłciÄ‡ do Kwadransu z behawiorystÄ…, jeĹ›li temat wymaga dopasowania do Twojej sytuacji.',
    },
  ] satisfies TrustSignalItem[],
  dogBehaviorist: [
    {
      title: 'Najpierw przyczyna, potem plan',
      copy: 'Przy psich problemach waĹĽniejsze od samego objawu bywa to, co go napÄ™dza: napiÄ™cie, frustracja, lÄ™k albo codzienny chaos.',
    },
    {
      title: '15-minutowa konsultacja behawioralna ma wĹ‚asne miejsce',
      copy: 'To osobna forma pomocy dla jednego pytania albo spokojnego uporzÄ…dkowania tematu.',
    },
    {
      title: 'JeĹ›li online nie wystarczy, powiem to wprost',
      copy: 'Nie zatrzymujÄ™ psa i opiekuna w formacie, ktĂłry nie ma szans zadziaĹ‚aÄ‡.',
    },
  ] satisfies TrustSignalItem[],
  catBehaviorist: [
    {
      title: 'Kot nie zmienia zachowania bez powodu',
      copy: 'Przy kotach porzÄ…dkujemy zdrowie, Ĺ›rodowisko i relacje zanim zaczniemy cokolwiek â€žtrenowaÄ‡â€ť.',
    },
    {
      title: 'NagĹ‚a zmiana = najpierw zdrowie',
      copy: 'To element bezpiecznego procesu, a nie przerzucanie odpowiedzialnoĹ›ci. Przy kotach to szczegĂłlnie waĹĽne.',
    },
    {
      title: 'Online dobrze dziaĹ‚a przy kocich tematach',
      copy: 'Kuweta, stres, wycofanie i konflikty zwykle wymagajÄ… przede wszystkim dobrego rozpoznania Ĺ›rodowiska i historii.',
    },
  ] satisfies TrustSignalItem[],
  opinions: [
    {
      title: 'Status publiczny opisany dokĹ‚adnie',
      copy: 'Warstwa trust korzysta z tego samego opisu co profil CAPBT i schema: dyplomant COAPE, bez dopisywania szerszych tytuĹ‚Ăłw.',
    },
    {
      title: 'KaĹĽda karta ma kontekst pracy',
      copy: 'Przy przykĹ‚adach pokazujÄ™ typ problemu, format kontaktu, etap wspĂłĹ‚pracy i przybliĹĽony czas pierwszych zmian, ĹĽeby nie zostawiaÄ‡ samych ogĂłlnych cytatĂłw.',
    },
    {
      title: 'Profil, publikacje i ograniczenia',
      copy: 'Obok opinii sÄ… publiczne ĹşrĂłdĹ‚a i wyraĹşna informacja, ĹĽe kaĹĽdy przypadek jest osobny. To materiaĹ‚ dowodowy, nie obietnica identycznego efektu.',
    },
  ] satisfies TrustSignalItem[],
} as const

export const CASE_STUDY_SELECTIONS = {
  dogBehaviorist: ['case-01', 'case-02'] as const,
  catBehaviorist: ['case-05', 'case-06'] as const,
  opinions: ['case-01', 'case-02', 'case-05', 'case-06'] as const,
  problemLandings: {
    'reaktywnosc-na-smyczy': 'case-01',
    'lek-separacyjny': 'case-02',
    'zalatwianie-poza-kuweta': 'case-05',
    'konflikt-miedzy-kotami': 'case-06',
  } as const,
} as const

export function getCaseStudiesByIds(ids: readonly string[]) {
  const studies = ids
    .map((id) => REAL_CASE_STUDIES.find((item) => item.id === id))
    .filter((item): item is (typeof REAL_CASE_STUDIES)[number] => Boolean(item))

  return studies
}

