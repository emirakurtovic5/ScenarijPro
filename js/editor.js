let editor;

window.onload = () => {
    const div = document.getElementById("editorContent"); 
    editor = EditorTeksta(div);
};

function prikaziPoruku(text, type = "info") {
    const output = document.getElementById("output");
    output.innerHTML = `<div class="${type}">${text}</div>`;
}

const boldirajTekst = () => {
    const result = editor.formatirajTekst("bold");
    prikaziPoruku(result ? "BOLD primijenjen" : "BOLD nije uspio - provjerite konzolu", result ? "success" : "error");
};

const italicTekst = () => {
    const result = editor.formatirajTekst("italic");
    prikaziPoruku(result ? "ITALIC primijenjen" : "ITALIC nije uspio", result ? "success" : "error");
};

const underlineTekst = () => {
    const result = editor.formatirajTekst("underline");
    prikaziPoruku(result ? "UNDERLINE primijenjen" : "UNDERLINE nije uspio", result ? "success" : "error");
};

const GrupisiUloge = () => {
    const rezultat = editor.grupisiUloge();
    prikaziPoruku(rezultat.length === 0 ? "Nema grupa" : JSON.stringify(rezultat, null, 2));
};

const ScenarijUloge = () => {
    const uloge = editor.dajUloge();
    if (uloge.length === 0) {
        prikaziPoruku("Nema uloga! Provjerite format teksta.", "error");
        return;
    }
    const rezultat = editor.scenarijUloge(uloge[0]);
    prikaziPoruku(`Scenarij za ${uloge[0]}:\n\n${JSON.stringify(rezultat, null, 2)}`);
};

const BrojLinijaTeksta = () => {
    const uloge = editor.dajUloge();
    console.log("Uloge za brojanje:", uloge);
    if (uloge.length === 0) {
        prikaziPoruku("Nema pronađenih uloga! Provjerite format:\n\nPrimer:\nCAPTAIN KIRA\nDijalog ide ovde.", "error");
        return;
    }
    const rezultat = uloge.map(u => `${u}: ${editor.brojLinijaTeksta(u)} linija`).join("\n");
    prikaziPoruku(rezultat);
};

const PogresnaUloga = () => {
    const rezultat = editor.pogresnaUloga();
    prikaziPoruku(rezultat.length === 0 ? "Sve OK!" : `Potencijalno: ${rezultat.join(", ")}`, rezultat.length === 0 ? "success" : "error");
};

const DajUloge = () => {
    const uloge = editor.dajUloge();
    prikaziPoruku(uloge.length === 0 ? "Nema uloga" : `Uloge (${uloge.length}):\n\n${uloge.join("\n")}`);
};

const DajBrojRijeci = () => {
    const rez = editor.dajBrojRijeci();
    prikaziPoruku(`STATISTIKA:\n\nUkupno: ${rez.ukupno}\nBold: ${rez.boldiranih}\nItalic: ${rez.italic}`);
};