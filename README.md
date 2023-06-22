# Slido

Kreirati aplikaciju koja će pomoći u interakciji publike tokom predavanja, konferencija i drugih sličnih događaja.

Aplikacija se sastoji od više modula, te je predviđena za korištenje različitim tipovima korisnika:

## - administrator sistema;
## - predavač;
## - publika.

Administrator sistema je korisnik koji ima osnovnu kontrolu kad dešavanjima u sistemu. Može raditi CRUD operacija nad svim šifrarnicima (lookup tabelama), može brisati postojeće korisnike, te ih može blokirati na period od 15 ili 30 dana. Administrator sistema vidi sva zakazana predavanja, te može brisati buduća predavanja. Više korisnika može imati ulogu administratora sistema. Admin korisnici se dodaju direktno kroz bazu podataka.

Predavači su registrovani korisnici koji imaju veliki broj mogućnosti u sistemu. Predavači zakazuju predavanja, dijele pristupne podatke gostima (publici), odgovaraju na pitanja, filtriraju pitanja, prate izvještaje i drugo.

Publiku čine gosti sistema (korisnici koji nisu registrovani). Pristupaju putem linka ili koda određenom predavanju, imaju mogućnost postavljanja pitanja, odobravanja već postavljenih pitanja i drugo.

# Frontend: Node.js
# Backend: Node.js
# Baza: Posgresql
