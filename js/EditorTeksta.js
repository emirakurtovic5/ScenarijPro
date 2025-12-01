let EditorTeksta = function(divRef) {
    if (!(divRef instanceof HTMLDivElement)) {
        throw new Error("Pogresan tip elementa!");
    }
    if (!divRef.hasAttribute("contenteditable") || divRef.getAttribute("contenteditable") !== "true") {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    let editorDiv = divRef;

    const isLinijaUZagradama = (line) => {
        if (!line) return false;
        return /^\(.*\)$/.test(line.trim());
    };

    const dajBrojRijeci = function () {
    let ukupno = 0, bold = 0, italic = 0;

    const walker = document.createTreeWalker(editorDiv, NodeFilter.SHOW_TEXT, null, false);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        if (!text || !text.trim()) continue;

        
        const matches = text.match(/\b[a-zA-Z]+(?:[-'][a-zA-Z]+)*\b/g);

        if (!matches) continue;

        let parent = node.parentNode;
        let isBold = parent.closest("b, strong") !== null;
        let isItalic = parent.closest("i, em") !== null;

        matches.forEach(() => {
            ukupno++;
            if (isBold) bold++;
            if (isItalic) italic++;
        });
    }

    return { ukupno, boldiranih: bold, italic: italic };
};

const dajUloge = function() {
    let lines = getLines();
    let uloge = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i] ? lines[i].trim() : "";
        
        if (isUloga(line) && !uloge.includes(line)) {
            if (imaGovorIspod(i, lines)) {
                uloge.push(line);
            }
        }
    }
    return uloge;
};

const pogresnaUloga = function() {
    let lines = getLines();
    let uloge = dajUloge();
    let counts = {};
    uloge.forEach(u => counts[u] = 0);

    lines.forEach((l, idx) => { 
        let trimmed = l ? l.trim() : "";
        let nextLine = lines[idx+1] ? lines[idx+1].trim() : "";
        if (isUloga(trimmed, nextLine)) counts[trimmed]++; 
    });

    let potencijalno = [];
    for (let a of uloge) {
        for (let b of uloge) {
            if (a === b) continue;
                let razlika = 0;
                let minLen = Math.min(a.length, b.length);
                for (let i = 0; i < minLen; i++) if (a[i] !== b[i]) razlika++;
                razlika += Math.abs(a.length - b.length);
                if ((a.length > 5 && razlika <= 2) || (a.length <=5 && razlika <=1)) {
                    if (counts[b] >=4 && counts[b] - counts[a] >=3) {
                        if (!potencijalno.includes(a)) potencijalno.push(a);
                    }
                }
            }
        }
    return potencijalno;
};

const brojLinijaTeksta = function(uloga) {
    let lines = getLines();
    let count = 0;
        
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i] ? lines[i].trim() : "";
            let nextLine = lines[i+1] ? lines[i+1].trim() : "";
            
            if (isUloga(line, nextLine) && line.toLowerCase() === uloga.toLowerCase()) {
                
                for (let j = i+1; j < lines.length; j++) {
                    let currentLine = lines[j] ? lines[j].trim() : "";
                    let nextCheck = lines[j+1] ? lines[j+1].trim() : "";
                    
                    if (!currentLine || isUloga(currentLine, nextCheck) || isNaslovScene(currentLine)) {
                        
                        break;
                    }
                    if (!isLinijaUZagradama(currentLine)) {
                        count++;
                        
                    }
                }
            }
        }
        
    return count;
};

const scenarijUloge = function(uloga) {
    let lines = getLines();
    let rezultat = [];
    let trenutnaScena = null;
    let govoriUSceni = [];
    let indexUTekstu = 0;

    

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i] ? lines[i].trim() : "";
        
        if (isNaslovScene(line)) {
            
            if (govoriUSceni.length > 0) {
                procesirajScenu(trenutnaScena, govoriUSceni, uloga, rezultat);
            }
            
            trenutnaScena = line;
            govoriUSceni = [];
            indexUTekstu = 0;
            continue;
        }
        
        
        let nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
        if (isUloga(line, nextLine)) {
            let ulogaIme = line;
            let linijeGovora = [];
            
            
            let j = i + 1;
            while (j < lines.length) {
                let govorLine = lines[j] ? lines[j].trim() : "";
                let nextGovorLine = j + 1 < lines.length ? lines[j + 1].trim() : "";
                
                
                if (!govorLine || isUloga(govorLine, nextGovorLine) || isNaslovScene(govorLine)) {
                    break;
                }
                
                if (!isLinijaUZagradama(govorLine)) {
                    linijeGovora.push(govorLine);
                }
                j++;
            }
            
            if (linijeGovora.length > 0) {
                indexUTekstu++;
                govoriUSceni.push({
                    uloga: ulogaIme,
                    linije: linijeGovora,
                    pozicija: indexUTekstu
                });
                
            }
            
            i = j - 1; 
        }
    }
    
    
    if (govoriUSceni.length > 0) {
        procesirajScenu(trenutnaScena, govoriUSceni, uloga, rezultat);
    }
    
    
    return rezultat;
};

const isNaslovScene = (line) => {
    if (!line) return false;
    let trimmed = line.trim();

    return /^(INT|EXT)\.\s*-\s*(DAY|NIGHT|AFTERNOON|MORNING|EVENING)/i.test(trimmed);
};



const isUloga = (line) => {
    if (!line || line.trim() === "") return false;
    let trimmed = line.trim();

    if (!/^[A-Z][A-Z ]*$/.test(trimmed)) return false;
    if (isNaslovScene(trimmed)) return false;
    if (trimmed.length > 50) return false;

    return true;
};




const procesirajScenu = function(scena, govori, ciljanaUloga, rezultat) {
    
    
    for (let i = 0; i < govori.length; i++) {
        let govor = govori[i];
        
        if (govor.uloga.toLowerCase() === ciljanaUloga.toLowerCase()) {
            let prethodni = i > 0 ? {
                uloga: govori[i - 1].uloga,
                linije: govori[i - 1].linije
            } : null;
            
            let sljedeci = i < govori.length - 1 ? {
                uloga: govori[i + 1].uloga,
                linije: govori[i + 1].linije
            } : null;
            
            rezultat.push({
                scena: scena,
                pozicijaUTekstu: govor.pozicija,
                prethodni: prethodni,
                trenutni: {
                    uloga: govor.uloga,
                    linije: govor.linije
                },
                sljedeci: sljedeci
            });
            
            
        }
    }
};

    
const imaGovorIspod = (index, lines) => {
    
    for (let i = index + 1; i < lines.length; i++) {
        const line = lines[i] ? lines[i].trim() : "";
        
        
        if (line === "") continue;
        
        
        if (isUloga(line) || isNaslovScene(line)) {
            return false;
        }
        
        
        if (isLinijaUZagradama(line)) continue;
        
        
        return true;
    }
    
    return false;
};
const getLines = () => {
    
    let tempDiv = editorDiv.cloneNode(true);
    
    
    let html = tempDiv.innerHTML;
    html = html.replace(/<br\s*\/?>/gi, '\n');
    
    
    let text = html.replace(/<[^>]*>/g, '');
    
    
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&amp;/g, '&');
    
    
    let lines = text.split('\n').map(l => l.trim());
    
    
    return lines;
};
const grupisiUloge = function() {
    const lines = getLines();
    
    
    let rezultat = [];
    let trenutnaScena = null;
    let segmentBroj = 0;
    let uSegmentu = false;
    let ulogeUSegmentu = new Set();
    let uRepliki = false;
    let trenutnaUloga = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        
        if (line === undefined) continue;
        
        const trimmed = line.trim();
        
        
        if (isNaslovScene(trimmed)) {
            
            
            
            if (uSegmentu && ulogeUSegmentu.size > 0) {
                rezultat.push({
                    scena: trenutnaScena,
                    segment: segmentBroj,
                    uloge: Array.from(ulogeUSegmentu)
                });
                
            }
            
            
            trenutnaScena = trimmed;
            segmentBroj = 0;
            uSegmentu = false;
            ulogeUSegmentu = new Set();
            uRepliki = false;
            trenutnaUloga = null;
            continue;
        }
        
        
        if (trimmed === "") {
            uRepliki = false;
            trenutnaUloga = null;
            continue;
        }
        
        
        if (isUloga(trimmed) && imaGovorIspod(i, lines)) {
            
            if (!uSegmentu) {
                segmentBroj++;
                uSegmentu = true;
                
            }
            
            ulogeUSegmentu.add(trimmed);
            
            uRepliki = true;
            trenutnaUloga = trimmed;
            
            let j = i + 1;
            while (j < lines.length) {
                const nextLine = lines[j] ? lines[j].trim() : "";
                
                
                if (nextLine === "") {
                    break;
                }
                
                
                if (isUloga(nextLine) && imaGovorIspod(j, lines)) {
                    break;
                }
                
                if (isNaslovScene(nextLine)) {
                    break;
                }
                
                j++;
            }
            
            i = j - 1;
            continue;
        }
        
        if (isLinijaUZagradama(trimmed)) {
            continue;
        }
        
        if (uSegmentu && ulogeUSegmentu.size > 0) {
            rezultat.push({
                scena: trenutnaScena,
                segment: segmentBroj,
                uloge: Array.from(ulogeUSegmentu)
            });
            
            uSegmentu = false;
            ulogeUSegmentu = new Set();
        }
        
        uRepliki = false;
        trenutnaUloga = null;
    }
    
    if (uSegmentu && ulogeUSegmentu.size > 0) {
        rezultat.push({
            scena: trenutnaScena,
            segment: segmentBroj,
            uloge: Array.from(ulogeUSegmentu)
        });
    }
    
    return rezultat;
};

const formatirajTekst = function(komanda) {
    let sel = window.getSelection();
        
        if (!sel.rangeCount) {
            alert("Nema selekcije!");
            return false;
        }
        
        if (sel.isCollapsed) {
            alert("Molim selektirajte tekst!");
            return false;
        }

        let range = sel.getRangeAt(0);
        
        if (!editorDiv.contains(range.commonAncestorContainer)) {
            alert("Selekcija nije u editoru!");
            return false;
        }

        editorDiv.focus();
        
        let success = false;
        if (komanda === "bold") {
            success = document.execCommand("bold", false, null);
        } else if (komanda === "italic") {
            success = document.execCommand("italic", false, null);
        } else if (komanda === "underline") {
            success = document.execCommand("underline", false, null);
        }
        
        return success;
    };

    return {
        dajBrojRijeci,
        dajUloge,
        pogresnaUloga,
        brojLinijaTeksta,
        scenarijUloge,
        grupisiUloge,
        formatirajTekst
    };
};