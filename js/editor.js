let editor;
let scenarioId = null;
let lastDeltaTime = Math.floor(Date.now() / 1000);


window.onload = () => {
    const div = document.getElementById("editorContent");
    editor = EditorTeksta(div);

    
    ucitajScenario();

    
    document.getElementById("editorContent").addEventListener("click", e => {
        const line = e.target.closest(".editor-line");
        if (!line) return;

        
        document.getElementById("lineIdInput").value =
            line.dataset.lineId;

        
        document.querySelectorAll(".editor-line")
            .forEach(l => l.classList.remove("aktivna-linija"));

        line.classList.add("aktivna-linija");
    });

    
    setInterval(dohvatiPromjene, 3000);
};

function renderScenario(content) {
    const editorDiv = document.getElementById("editorContent");
    editorDiv.innerHTML = "";

    content.forEach(line => {
        const div = document.createElement("div");
        div.className = "editor-line";
        div.dataset.lineId = line.lineId;
        div.textContent = line.text || "";
        editorDiv.appendChild(div);
    });
}
function ucitajScenario() {
    const input = document.getElementById("scenarioIdInput");
    scenarioId = parseInt(input.value);

    if (!scenarioId) {
        prikaziPoruku("Unesite validan Scenario ID!", "error");
        return;
    }

    PoziviAjaxFetch.getScenario(scenarioId, function (status, data) {
        if (status === 200) {
            renderScenario(data.content);
            lastDeltaTime = Math.floor(Date.now() / 1000);
            prikaziPoruku("Scenario uspješno učitan", "success");
        } else {
            prikaziPoruku("Scenario ne postoji", "error");
        }
    });
}

function prikaziPoruku(text, type = "info") {
    const output = document.getElementById("output");
    output.innerHTML = `<div class="${type}">${text}</div>`;
}


const boldirajTekst = () => {
    const result = editor.formatirajTekst("bold");
    prikaziPoruku(
        result ? "BOLD primijenjen" : "BOLD nije uspio",
        result ? "success" : "error"
    );
};

const italicTekst = () => {
    const result = editor.formatirajTekst("italic");
    prikaziPoruku(
        result ? "ITALIC primijenjen" : "ITALIC nije uspio",
        result ? "success" : "error"
    );
};

const underlineTekst = () => {
    const result = editor.formatirajTekst("underline");
    prikaziPoruku(
        result ? "UNDERLINE primijenjen" : "UNDERLINE nije uspio",
        result ? "success" : "error"
    );
};


const GrupisiUloge = () => {
    const rezultat = editor.grupisiUloge();
    prikaziPoruku(
        rezultat.length === 0 ? "Nema grupa" : JSON.stringify(rezultat, null, 2)
    );
};

const ScenarijUloge = () => {
    const uloge = editor.dajUloge();
    if (uloge.length === 0) {
        prikaziPoruku("Nema uloga!", "error");
        return;
    }
    const rezultat = editor.scenarijUloge(uloge[0]);
    prikaziPoruku(
        `Scenarij za ${uloge[0]}:\n\n${JSON.stringify(rezultat, null, 2)}`
    );
};

const BrojLinijaTeksta = () => {
    const uloge = editor.dajUloge();
    if (uloge.length === 0) {
        prikaziPoruku("Nema pronađenih uloga!", "error");
        return;
    }
    const rezultat = uloge
        .map(u => `${u}: ${editor.brojLinijaTeksta(u)} linija`)
        .join("\n");
    prikaziPoruku(rezultat);
};

const PogresnaUloga = () => {
    const rezultat = editor.pogresnaUloga();
    prikaziPoruku(
        rezultat.length === 0
            ? "Sve OK!"
            : `Potencijalno: ${rezultat.join(", ")}`,
        rezultat.length === 0 ? "success" : "error"
    );
};

const DajUloge = () => {
    const uloge = editor.dajUloge();
    prikaziPoruku(
        uloge.length === 0
            ? "Nema uloga"
            : `Uloge (${uloge.length}):\n\n${uloge.join("\n")}`
    );
};

const DajBrojRijeci = () => {
    const rez = editor.dajBrojRijeci();
    prikaziPoruku(
        `STATISTIKA:\n\nUkupno: ${rez.ukupno}\nBold: ${rez.boldiranih}\nItalic: ${rez.italic}`
    );
};


const zakljucajLiniju = () => {
    if (!scenarioId) {
        prikaziPoruku("Prvo učitaj scenario!", "error");
        return;
    }

    const lineId = parseInt(
        document.getElementById("lineIdInput").value
    );
    const userId = parseInt(
        document.getElementById("userIdInput").value
    );

    if (!lineId || !userId) {
        prikaziPoruku("Klikni liniju i unesi User ID!", "error");
        return;
    }

    PoziviAjaxFetch.lockLine(
        scenarioId,
        lineId,
        userId,
        function (status, data) {
            if (status === 200) {
                prikaziPoruku("Linija zaključana", "success");
            } else {
                prikaziPoruku(data?.message || "Greška", "error");
            }
        }
    );
};


const sacuvajIzmjenuLinije = () => {
    if (!scenarioId) {
        prikaziPoruku("Prvo učitaj scenario!", "error");
        return;
    }

    const lineId = parseInt(
        document.getElementById("lineIdInput").value
    );
    const userId = parseInt(
        document.getElementById("userIdInput").value
    );
    const newTextRaw =
        document.getElementById("newTextInput").value;

    if (!lineId || !userId) {
        prikaziPoruku("Nedostaje Line ID ili User ID!", "error");
        return;
    }

    if (!newTextRaw.trim()) {
        prikaziPoruku("Unesite novi tekst!", "error");
        return;
    }

    const newText = newTextRaw.split("\n");

    PoziviAjaxFetch.updateLine(
        scenarioId,
        lineId,
        userId,
        newText,
        function (status, data) {
            if (status === 200) {
                prikaziPoruku("Izmjena sačuvana", "success");
                ucitajScenario(); 
            } else {
                prikaziPoruku(data?.message || "Greška", "error");
            }
        }
    );
};

const dohvatiPromjene = () => {
    PoziviAjaxFetch.getDeltas(scenarioId, lastDeltaTime, function (status, data) {
        if (status === 200 && data && data.deltas && data.deltas.length > 0) {
            console.log("Nove promjene:", data.deltas);
            
            
            data.deltas.forEach(delta => {
                if (delta.type === "line_update") {
                    
                    prikaziPoruku(`Linija ${delta.lineId} ažurirana: ${delta.content}`, "info");
                } else if (delta.type === "char_rename") {
                    
                    prikaziPoruku(`Lik promijenjen: ${delta.oldName} → ${delta.newName}`, "info");
                }
            });
            
            
            PoziviAjaxFetch.getScenario(scenarioId, function(status, data) {
                if (status === 200) {
                    const tekst = data.content.map(line => line.text).join('\n');
                    //document.getElementById("editorContent").innerHTML = tekst;
                    renderScenario(data.content);

                }
            });
        }
        lastDeltaTime = Math.floor(Date.now() / 1000);
    });
};
const zakljucajLik = () => {
    const characterName = document.getElementById("characterNameInput").value.trim();
    const userId = parseInt(document.getElementById("userIdInput").value);

    if (!characterName || !userId) {
        prikaziPoruku("Unesite ime lika i User ID!", "error");
        return;
    }

    if (!scenarioId) {
        prikaziPoruku("Prvo učitaj scenario!", "error");
        return;
    }

    PoziviAjaxFetch.lockCharacter(scenarioId, characterName, userId, function(status, data) {
        if (status === 200) {
            prikaziPoruku(`Lik "${characterName}" je zaključan`, "success");
        } else {
            prikaziPoruku(data?.message || "Greška pri lock-u lika", "error");
        }
    });
};

const promijeniImeLika = () => {
    const oldName = document.getElementById("characterNameInput").value.trim();
    const newName = document.getElementById("newCharacterNameInput").value.trim();
    const userId = parseInt(document.getElementById("userIdInput").value);

    if (!oldName || !newName || !userId) {
        prikaziPoruku("Unesite staro i novo ime lika i User ID!", "error");
        return;
    }

    if (!scenarioId) {
        prikaziPoruku("Prvo učitaj scenario!", "error");
        return;
    }

    PoziviAjaxFetch.updateCharacter(scenarioId, userId, oldName, newName, function(status, data) {
        if (status === 200) {
            prikaziPoruku(`Ime lika "${oldName}" promijenjeno u "${newName}"`, "success");
            ucitajScenario(); 
        } else {
            prikaziPoruku(data?.message || "Greška pri promjeni imena lika", "error");
        }
    });
};
