# ScenarijPro

ScenarijPro je web aplikacija za kreiranje i uređivanje scenarija.  
Omogućava korisnicima pregled projekata, pisanje scenarija sa jasno strukturiranim scenama i dijalozima, te uređivanje korisničkog profila.

Aplikacija podržava kolaborativni rad više korisnika, koristeći sistem zaključavanja kako bi se spriječili konflikti prilikom uređivanja.

---

## Tehnologije korištene

### Frontend
- HTML5
- CSS3
- Responzivni dizajn

### JavaScript moduli
- **EditorTeksta.js** – rad sa scenarijem u editoru
  - brojanje riječi
  - detekcija uloga
  - formatiranje teksta
- **PoziviAjax.js** – komunikacija sa backend-om putem AJAX zahtjeva

### Backend
- Node.js
- Express

### Baza podataka
Trajno pohranjivanje podataka o:
- scenarijima
- linijama teksta
- korisnicima

### Fontovi
- Poppins
- Inter
- Courier Prime

---

## Funkcionalnosti

### Pregled projekata
- Mreža kartica sa svim scenarijima
- Opcija kreiranja novog scenarija
- Sidebar sa navigacijom i profilom korisnika

### Pisanje scenarija
- Sticky zaglavlje sa alatima:
  - Scena
  - Akcija
  - Lik
  - Dijalog
- Sidebar sa listom scena
- Centralni editor za pisanje scenarija

### Uređivanje korisničkog profila
- Forma za pregled i izmjenu korisničkih podataka
- Sigurnosne postavke
- Notifikacije

---

## Backend API
- Kreiranje scenarija
- Zaključavanje i ažuriranje linija teksta
- Zaključavanje i promjena imena likova
- Praćenje promjena (deltas)

Podaci se čuvaju u bazi podataka radi trajne pohrane i konzistentnosti.
