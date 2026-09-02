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
      question: 'Czym jest Zapytaj behawiorystę?',
      answer:
        'To rozmowa telefoniczna do 15 minut. Mówisz, co naprawdę się dzieje, ustalamy priorytet i wybieramy pierwszy konkretny krok.',
    },
    {
      question: 'Czy Zapytaj behawiorystę wystarczy?',
      answer:
        'Przy jednym pytaniu albo przy pierwszym uporządkowaniu tematu często tak. Przy sprawie złożonej pomaga zdecydować, czy potrzebujesz szerszej konsultacji.',
    },
    {
      question: 'Czy pełna konsultacja online ma sens?',
      answer:
        'Tak. Przy wielu problemach ważne są historia, środowisko i codzienny rytm, a nie tylko sam objaw.',
    },
    {
      question: 'Czy mogę najpierw napisać?',
      answer:
        'Tak. Krótka wiadomość pomaga doprecyzować sytuację, jeśli nie chcesz rezerwować od razu.',
    },
  ] satisfies TrustFaqItem[],
  dogs: [
    {
      question: 'Czy pomoc jest tylko dla bardzo trudnych przypadków?',
      answer:
        'Nie. Wiele osób zgłasza się wtedy, gdy chce zrozumieć sytuację i wybrać spokojny pierwszy krok, zanim problem urośnie.',
    },
    {
      question: 'Czy konsultacja online ma sens przy spacerach albo reaktywności?',
      answer:
        'Tak. W wielu psich tematach wystarcza, żeby uporządkować wyzwalacze, próg reakcji i pierwszy plan działania.',
    },
    {
      question: 'Co jeśli byłem u trenera, a problem wraca?',
      answer:
        'To częsty sygnał, że pod spodem jest temat emocji, pobudzenia albo środowiska. Wtedy konsultacja behawioralna daje lepszy punkt startu.',
    },
    {
      question: 'Kiedy warto zgłosić się po pomoc?',
      answer:
        'Wtedy, gdy temat wraca, obciąża codzienność albo kolejne próby nic nie zmieniają. Nie trzeba czekać, aż zrobi się naprawdę źle.',
    },
    {
      question: 'Czy warto zgłosić się, jeśli trudność dopiero zaczyna się u psa?',
      answer: 'Tak. Im wcześniej złapiemy schemat, tym łatwiej zatrzymać jego utrwalanie.',
    },
    {
      question: 'Czy pomagasz przy rozłące i trudnym zostawaniu samemu?',
      answer:
        'Tak. W takich sytuacjach szczególnie ważny jest spokojny plan pierwszych kroków i tempo dopasowane do psa.',
    },
    {
      question: 'Czy konsultacja ma sens, jeśli pies jest stale pobudzony i trudno mu się wyciszyć?',
      answer:
        'Tak. Sprawdzamy rytm dnia, obciążenie i to, co pomaga wracać do równowagi bez dokładania presji.',
    },
    {
      question: 'Co jeśli pies ma kilka trudności naraz?',
      answer: 'To bardzo częste. Najpierw wybieramy temat, od którego warto zacząć, żeby reszta też mogła się uporządkować.',
    },
  ] satisfies TrustFaqItem[],
  cats: [
    {
      question: 'Czy konsultacja ma sens, jeśli widzę tylko subtelne zmiany w zachowaniu kota?',
      answer:
        'Tak. Przy kotach właśnie drobne sygnały często najwięcej mówią o napięciu, bólu albo zmianie w środowisku.',
    },
    {
      question: 'Czy konsultacja online ma sens przy kuwecie, stresie albo wycofaniu?',
      answer:
        'Tak. W wielu kocich sprawach online w pełni wystarcza, żeby uporządkować środowisko, relacje i pierwszy kierunek działania.',
    },
    {
      question: 'Czy muszę już wiedzieć, czy problem dotyczy kuwety, stresu czy relacji?',
      answer:
        'Nie. Konsultacja jest po to, żeby oddzielić objaw od tła i ustalić, co dziś naprawdę wymaga uwagi.',
    },
    {
      question: 'Kiedy najpierw weterynarz?',
      answer:
        'Przy nagłej zmianie zachowania, szczególnie u kota. Najpierw wykluczamy tło zdrowotne, potem dokładamy warstwę behawioralną.',
    },
    {
      question: 'Czy konsultacja ma sens, jeśli kot stał się bardziej wycofany, czujny albo napięty?',
      answer: 'Tak. To sygnały, które warto uporządkować wcześnie, zanim staną się nową codziennością.',
    },
    {
      question: 'Czy pomagasz przy napięciu między kotami?',
      answer: 'Tak. W takich sytuacjach liczą się bezpieczeństwo, przestrzeń i dobra kolejność zmian.',
    },
    {
      question: 'Co jeśli zachowanie kota zmieniło się po przeprowadzce, nowym domowniku albo zmianie rytmu dnia?',
      answer: 'To częsty scenariusz. Takie zmiany potrafią mocno wpłynąć na kota, nawet jeśli z zewnątrz wyglądają niewinnie.',
    },
    {
      question: 'Czy konsultacja jest tylko dla poważnych problemów kota?',
      answer: 'Nie. Często warto odezwać się właśnie wtedy, gdy widzisz, że coś zaczyna iść w złą stronę.',
    },
  ] satisfies TrustFaqItem[],
  contact: [
    {
      question: 'Kiedy wybrać krótką wiadomość?',
      answer:
        'Gdy nie chcesz rezerwować od razu albo chcesz krótko doprecyzować temat.',
    },
    {
      question: 'Czy krótka wiadomość zastępuje konsultację?',
      answer:
        'Nie. To krótka wiadomość, po której wskażę, czy lepsza będzie 15-minutowa konsultacja behawioralna, pełna konsultacja czy jeszcze samo doprecyzowanie tematu.',
    },
    {
      question: 'Czy Zapytaj behawiorystę wymaga kamery?',
      answer: 'Nie. To połączenie telefoniczne przeznaczone do krótkiego omówienia sprawy i ustalenia, co robić dalej.',
    },
    {
      question: 'Czy mogę ustalić inny format, jeśli rozmowa głosowa jest dla mnie trudna?',
      answer:
        'Tak. Napisz przez formularz i opisz ograniczenie. Ustalimy, czy da się bezpiecznie przygotować inny wariant kontaktu.',
    },
  ] satisfies TrustFaqItem[],
  pricing: [
    {
      question: 'Czym jest Zapytaj behawiorystę?',
      answer:
        'To pierwszy, płatny kontakt: rozmowa telefoniczna do 15 minut. Opisujesz sytuację, dostajesz pierwszy kierunek działania i dwa pytania po rozmowie.',
    },
    {
      question: 'Czy Zapytaj behawiorystę to próbna konsultacja?',
      answer:
        'Nie. To samodzielna usługa pierwszego kontaktu. Jej celem jest podzielenie się problemem z profesjonalistą i otrzymanie pierwszego klucza.',
    },
    {
      question: 'Kiedy wybrać pełną konsultację zamiast Zapytaj behawiorystę?',
      answer:
        'Gdy problem trwa dłużej, ma kilka wątków albo po pierwszej rozmowie okaże się, że potrzebujesz około 90 minut online, analizy zachowania, planu i 14 dni komunikacji w pokoju klienta.',
    },
    {
      question: 'Co dostaję po pełnej konsultacji?',
      answer:
        'Analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    },
    {
      question: 'Czy mogę od razu wejść w pełną konsultację?',
      answer: 'Tak. Możesz zapoznać się z pełną konsultacją, ale jej termin jest udostępniany indywidualnie po pierwszym kroku.',
    },
  ] satisfies TrustFaqItem[],
  consultation: [
    {
      question: 'Kiedy to jest dobry moment, żeby się odezwać?',
      answer:
        'Gdy coś wraca, nasila się albo zaczyna ustawiać codzienność w domu. Nie trzeba czekać, aż zrobi się naprawdę trudno.',
    },
    {
      question: 'Czy mogę napisać, jeśli nie umiem dobrze nazwać problemu?',
      answer:
        'Tak. Wystarczy zwykły opis tego, co widzisz na co dzień. Nazwę i porządek możemy ustalić później.',
    },
    {
      question: 'Jak wygląda pierwsza konsultacja?',
      answer:
        'Najpierw porządkujemy sytuację, potem patrzymy na tło i codzienność, a na końcu wybieramy pierwszy krok.',
    },
    {
      question: 'Co dostanę po konsultacji?',
      answer: 'Jasny kierunek, priorytet i pierwszy plan, który da się realnie wdrożyć.',
    },
    {
      question: 'Czy konsultacja online ma sens?',
      answer:
        'Tak. Przy większości problemów behawioralnych online nie jest kompromisem, bo najważniejsze są historia, środowisko i kontekst.',
    },
    {
      question: 'Czy muszę mieć kamerę albo nagranie?',
      answer:
        'Nie. Kamera jest opcjonalna, a nagranie bywa pomocne, ale nie jest warunkiem rozpoczęcia rozmowy.',
    },
    {
      question: 'Czy pies albo kot musi być przy mnie podczas konsultacji?',
      answer:
        'Nie musi. Pracuję na tym, co opisujesz. Jeśli zwierzę jest obok i coś pokazuje, to tylko dodatkowy kontekst.',
    },
    {
      question: 'Co jeśli temat okaże się poza zakresem?',
      answer:
        'Powiem to wprost i skieruję Cię do odpowiedniego specjalisty. Nie zatrzymuję Cię w formacie, który nie wystarczy.',
    },
  ] satisfies TrustFaqItem[],
  dogBehaviorist: [
    {
      question: 'Czy Zapytaj behawiorystę ma sens przy psie, jeśli nie umiem nazwać problemu?',
      answer:
        'Tak. Wystarczy opis tego, co widzisz. Pomagam nazwać temat, ocenić priorytet i wybrać właściwy pierwszy ruch.',
    },
    {
      question: 'Czy pomoc behawiorysty ma sens po nieudanym treningu?',
      answer:
        'Tak. Trening nie zawsze sięga tego, co napędza zachowanie. Przy lęku, reaktywności albo pobudzeniu trzeba najpierw zrozumieć tło.',
    },
    {
      question: 'Czy przy problemie psa online wystarczy?',
      answer:
        'Bardzo często tak. Wyjątki są jasne i jeśli Twój przypadek do nich należy, powiem o tym od razu.',
    },
    {
      question: 'Z czym najczęściej zgłaszają się opiekunowie psów?',
      answer:
        'Najczęściej ze spacerami, reaktywnością, rozłąką, pobudzeniem w domu albo trudnym startem po adopcji.',
    },
  ] satisfies TrustFaqItem[],
  catBehaviorist: [
    {
      question: 'Czy Zapytaj behawiorystę ma sens przy problemie kota?',
      answer:
        'Tak. To dobry format, gdy chcesz ustalić, czy temat jest behawioralnay, środowiskowy czy wymaga najpierw weterynarza.',
    },
    {
      question: 'Czy każda zmiana zachowania kota jest behawioralna?',
      answer:
        'Nie. Przy nagłych zmianach pierwszym krokiem bywa weterynarz. To element bezpiecznej analizy zachowania, nie przeszkoda.',
    },
    {
      question: 'Czy online wystarczy przy kuwecie albo konflikcie między kotami?',
      answer:
        'W wielu przypadkach tak, bo kluczowe są środowisko, zasoby, historia zmian i relacje w domu.',
    },
    {
      question: 'Z czym najczęściej zgłaszają się opiekunowie kotów?',
      answer:
        'Najczęściej z kuwetą, stresem środowiskowym, wycofaniem, nagłą zmianą zachowania i napięciem między kotami.',
    },
  ] satisfies TrustFaqItem[],
  toolkit: [
    {
      question: 'Czy materiały PDF zastępują konsultację?',
      answer:
        'Nie. To uporządkowany hub materiałów do samodzielnej pracy. Jeśli temat jest mieszany albo wraca, rozmowa zwykle daje lepszy start.',
    },
    {
      question: 'Od czego zacząć w materiałach PDF?',
      answer:
        'Od jednego materiału najbliższego Twojej sytuacji. Jeśli po przejrzeniu nadal nie wiesz, co wybrać, napisz krótką wiadomość.',
    },
    {
      question: 'Czy materiały są tylko dla osób przed konsultacją?',
      answer:
        'Nie. W materiałach PDF są materiały startowe, własne przewodniki i materiały uzupełniające do dalszej pracy.',
    },
    {
      question: 'Czy po materiale warto wrócić do rozmowy?',
      answer:
        'Tak, jeśli temat wymaga dopasowania do Twojej sytuacji albo widzisz, że sam materiał nie wystarcza do uporządkowania problemu.',
    },
  ] satisfies TrustFaqItem[],
  opinions: [
    {
      question: 'Czy opinie są anonimowe?',
      answer: 'Tak. Pokazuję tylko tyle, ile wystarczy, żeby zachować kontekst bez odsłaniania danych wrażliwych.',
    },
    {
      question: 'Czy opinie pokazują realne sytuację?',
      answer:
        'Tak. To krótkie głosy po konsultacjach i przykładowe opisy sytuacji, w których było wiadomo, od czego zacząć.',
    },
    {
      question: 'Czego można się po nich spodziewać?',
      answer:
        'Raczej tonu rozmowy, sposobu tłumaczenia i tego, co pomaga uporządkować temat na starcie.',
    },
    {
      question: 'Czy po przeczytaniu opinii nadal mogę napisać krótką wiadomość?',
      answer:
        'Tak. Jeśli nie chcesz od razu wybierać terminu, możesz zacząć od krótkiej wiadomości.',
    },
  ] satisfies TrustFaqItem[],
} as const

export const TRUST_SIGNAL_SETS = {
  contact: [
    {
      title: 'Jasny zakres kontaktu',
      copy: 'Krótka wiadomość ma doprecyzować sytuację, a nie zamienić się w długą korespondencję przed rozmową.',
    },
    {
      title: 'Szczera rekomendacja',
      copy: 'Jeśli temat wymaga od razu pełnej konsultacji albo najpierw weterynarza, mówię to wprost po zapoznaniu się z sytuacją.',
    },
    {
      title: 'Więcej o mnie',
      copy: 'Na stronie o mnie są krótko opisane kwalifikacje, publikacje i sposób pracy.',
      href: '/o-mnie',
      cta: 'Zobacz stronę o mnie',
    },
  ] satisfies TrustSignalItem[],
  pricing: [
    {
      title: 'Dwa sposoby pierwszego kontaktu',
      copy: 'Zapytaj behawiorystę jest dostępne w wybranym terminie, a Zapytaj teraz pojawia się tylko przy ręcznie włączonej dostępności. Pełna konsultacja jest kolejnym procesem.',
    },
    {
      title: 'Bez kamery, jeśli nie chcesz',
      copy: 'Zapytaj behawiorystę i Zapytaj teraz są rozmowami telefonicznymi. Przy pełnej konsultacji kamera pozostaje opcjonalna.',
    },
    {
      title: 'Bez obietnic na zapas',
      copy: 'Nie obiecuję efektów po jednej rozmowie. Obiecuję uczciwe ustawienie priorytetu i pierwszego sensownego planu.',
    },
  ] satisfies TrustSignalItem[],
  consultation: [
    {
      title: 'Analiza zachowania przed techniką',
      copy: 'Konsultacja zaczyna się od tego, co napędza zachowanie, a nie od dopisywania gotowej metody.',
    },
    {
      title: 'Zakres mówiony wprost',
      copy: 'Jeśli temat wymaga innego specjalisty albo formatu stacjonarnego, komunikuję to jasno.',
    },
    {
      title: 'Podsumowanie po pełnej konsultacji',
      copy: 'Po pełnej konsultacji dostajesz plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    },
  ] satisfies TrustSignalItem[],
  toolkit: [
    {
      title: 'Materiały jako wsparcie, nie zamiennik rozmowy',
      copy: 'Materiały PDF mają porządkować temat i dawać punkt startu. Gdy sytuacja jest wielowątkowa, lepiej przejść do rozmowy.',
    },
    {
      title: 'Selekcja zamiast katalogu wszystkiego',
      copy: 'Każda pozycja jest tu dlatego, że przydaje się w konkretnej sytuacji, a nie dlatego, że wypełnia półkę.',
    },
    {
      title: 'Spokojny next step',
      copy: 'Po materiale możesz przejść do Zapytaj behawiorystę, jeśli temat wymaga dopasowania do Twojej sytuacji.',
    },
  ] satisfies TrustSignalItem[],
  dogBehaviorist: [
    {
      title: 'Najpierw przyczyna, potem plan',
      copy: 'Przy psich problemach ważniejsze od samego objawu bywa to, co go napędza: napięcie, frustracja, lęk albo codzienny chaos.',
    },
    {
      title: 'Zapytaj behawiorystę ma własne miejsce',
      copy: 'To osobna forma pomocy dla osoby, która chce opisać problem i dostać konkretny pierwszy kierunek.',
    },
    {
      title: 'Jeśli online nie wystarczy, powiem to wprost',
      copy: 'Nie zatrzymuję psa i opiekuna w formacie, który nie ma szans zadziałać.',
    },
  ] satisfies TrustSignalItem[],
  catBehaviorist: [
    {
      title: 'Kot nie zmienia zachowania bez powodu',
      copy: 'Przy kotach porządkujemy zdrowie, środowisko i relacje zanim zaczniemy cokolwiek „trenowaćâ€ť.',
    },
    {
      title: 'Nagła zmiana = najpierw zdrowie',
      copy: 'To element bezpiecznego procesu, a nie przerzucanie odpowiedzialności. Przy kotach to szczególnie ważne.',
    },
    {
      title: 'Online dobrze działa przy kocich tematach',
      copy: 'Kuweta, stres, wycofanie i konflikty zwykle wymagają przede wszystkim dobrego rozpoznania środowiska i historii.',
    },
  ] satisfies TrustSignalItem[],
  opinions: [
    {
      title: 'Status publiczny opisany dokładnie',
      copy: 'Warstwa trust korzysta z tego samego opisu co profil CAPBT i schema: dyplomant COAPE, bez dopisywania szerszych tytułów.',
    },
    {
      title: 'Każda karta ma kontekst pracy',
      copy: 'Przy przykładach pokazuję typ problemu, format kontaktu, etap współpracy i przybliżony czas pierwszych zmian, żeby nie zostawiać samych ogólnych cytatów.',
    },
    {
      title: 'Profil, publikacje i ograniczenia',
      copy: 'Obok opinii są publiczne źródła i wyraźna informacja, że każdy przypadek jest osobny. To materiał dowodowy, nie obietnica identycznego efektu.',
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

