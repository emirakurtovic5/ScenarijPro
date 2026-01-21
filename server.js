const express = require("express");
const sequelize = require('./database');


const Scenario = require('./models/Scenario');
const Line = require('./models/Line');
const Delta = require('./models/Delta');
const Checkpoint = require('./models/Checkpoint');

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


Scenario.hasMany(Line, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Line.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Delta, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Delta.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Checkpoint, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Checkpoint.belongsTo(Scenario, { foreignKey: 'scenarioId' });

// Inicijalizacija baze podataka
/*async function initializeDatabase() {
  try {
    await sequelize.sync({ force: true });
    console.log('Baza podataka uspješno inicijalizovana!');
    console.log('Tabele su kreirane.');
  } catch (error) {
    console.error('Greška pri inicijalizaciji baze:', error);
  }
}*/


const userLocks = {};
const characterLocks = {};


app.post('/api/scenarios', async function(req, res){
    try {
        let { title } = req.body;

        if (!title || title.trim() === "") {
            title = "Neimenovani scenarij";
        }

        
        const scenario = await Scenario.create({ title });

        
        await Line.create({
            lineId: 1,
            text: "",
            nextLineId: null,
            scenarioId: scenario.id
        });

        
        const lines = await Line.findAll({ 
            where: { scenarioId: scenario.id },
            order: [['lineId', 'ASC']]
        });

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: lines.map(l => ({
                lineId: l.lineId,
                nextLineId: l.nextLineId,
                text: l.text
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', async function(req, res){
    try {
        const scenarioId = req.params.scenarioId;
        const lineId = parseInt(req.params.lineId);
        const { userId } = req.body;

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        
        const line = await Line.findOne({
            where: { scenarioId, lineId }
        });

        if (!line) {
            return res.status(404).json({ message: "Linija ne postoji!" });
        }

        
        for (let otherUserId in userLocks) {
            const lock = userLocks[otherUserId];

            if (lock.scenarioId === scenarioId && 
                lock.lineId === lineId && 
                otherUserId !== userId.toString()) {
                return res.status(409).json({ message: "Linija je vec zakljucana!" });
            }
        }

        
        if (userLocks[userId]) {
            if (userLocks[userId].scenarioId === scenarioId && 
                userLocks[userId].lineId === lineId) {
                return res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
            }
            delete userLocks[userId];
        }

        
        userLocks[userId] = {
            scenarioId: scenarioId,
            lineId: lineId
        };

        res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function countWords(text) {
    text = text.replace(/<[^>]*>/g, ' ');
    const words = text.match(/[a-zA-ZčćžšđČĆŽŠĐ]+[-']?[a-zA-ZčćžšđČĆŽŠĐ]*/g);
    return words ? words.length : 0;
}

function wrapText(text) {
    const cleanText = text.replace(/<[^>]*>/g, ' ');
    const words = cleanText.match(/[a-zA-ZčćžšđČĆŽŠĐ]+[-']?[a-zA-ZčćžšđČĆŽŠĐ]*/g);

    if (!words || words.length === 0) {
        return [text]; 
    }

    if (words.length <= 20) {
        return [text]; 
    }

    const lines = [];
    const tokens = text.split(/(\s+|[.,!?;:]+)/); 

    let currentLine = '';
    let wordCount = 0;

    for (let token of tokens) {
        const isWord = /[a-zA-ZčćžšđČĆŽŠĐ]+[-']?[a-zA-ZčćžšđČĆŽŠĐ]*/.test(token);

        if (isWord) {
            wordCount++;

            if (wordCount > 20) {
                lines.push(currentLine.trim());
                currentLine = token;
                wordCount = 1;
            } else {
                currentLine += token;
            }
        } else {
            currentLine += token;
        }
    }

    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    return lines;
}


app.put('/api/scenarios/:scenarioId/lines/:lineId', async function(req, res){
    try {
        const scenarioId = req.params.scenarioId;
        const lineId = parseInt(req.params.lineId);
        const { userId, newText } = req.body;

        if (!newText || !Array.isArray(newText) || newText.length === 0) {
            return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
        }

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        
        const line = await Line.findOne({
            where: { scenarioId, lineId }
        });

        if (!line) {
            return res.status(404).json({ message: "Linija ne postoji!" });
        }

       
        if (!userLocks[userId]) {
            return res.status(409).json({ message: "Linija nije zakljucana!" });
        }

        if (userLocks[userId].scenarioId !== scenarioId || 
            userLocks[userId].lineId !== lineId) {
            return res.status(409).json({ message: "Linija je vec zakljucana!" });
        }

        
        const allLines = [];
        for (let textItem of newText) {
            const wrappedLines = wrapText(textItem);
            allLines.push(...wrappedLines);
        }

        
        const maxLine = await Line.findOne({
            where: { scenarioId },
            order: [['lineId', 'DESC']]
        });
        let maxLineId = maxLine ? maxLine.lineId : 0;

        const originalNextLineId = line.nextLineId;
        const timestamp = Math.floor(Date.now() / 1000);

        
        await line.update({ text: allLines[0] });

        
        await Delta.create({
            scenarioId: parseInt(scenarioId),
            type: "line_update",
            lineId: lineId,
            nextLineId: allLines.length > 1 ? maxLineId + 1 : originalNextLineId,
            content: allLines[0],
            timestamp: timestamp
        });

        
        if (allLines.length > 1) {
            const newLinesToInsert = [];

            for (let i = 1; i < allLines.length; i++) {
                maxLineId++;
                const newNextLineId = (i === allLines.length - 1) ? originalNextLineId : maxLineId + 1;

                
                await Line.create({
                    lineId: maxLineId,
                    nextLineId: newNextLineId,
                    text: allLines[i],
                    scenarioId: scenarioId
                });

                
                await Delta.create({
                    scenarioId: parseInt(scenarioId),
                    type: "line_update",
                    lineId: maxLineId,
                    nextLineId: newNextLineId,
                    content: allLines[i],
                    timestamp: timestamp
                });
            }

            
            await line.update({ nextLineId: maxLineId - allLines.length + 2 });
        } else {
            await line.update({ nextLineId: originalNextLineId });
        }

        
        delete userLocks[userId];

        res.status(200).json({ message: "Linija je uspjesno azurirana!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/scenarios/:scenarioId/characters/lock', async function(req, res){
    try {
        const scenarioId = req.params.scenarioId;
        const { userId, characterName } = req.body;

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        if (!characterLocks[scenarioId]) {
            characterLocks[scenarioId] = {};
        }

        if (characterLocks[scenarioId][characterName]) {
            return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
        }

        characterLocks[scenarioId][characterName] = userId;

        return res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/scenarios/:scenarioId/characters/update', async function(req, res){
    try {
        const scenarioId = req.params.scenarioId;
        const { userId, oldName, newName } = req.body;

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        
        if (!characterLocks[scenarioId] || characterLocks[scenarioId][oldName] !== userId) {
            return res.status(409).json({ message: "Ime lika nije zakljucano!" });
        }

        
        const lines = await Line.findAll({
            where: { scenarioId }
        });

        
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        for (let line of lines) {
            if (line.text) {
                const updatedText = line.text.replace(regex, newName);
                await line.update({ text: updatedText });
            }
        }

        
        const timestamp = Math.floor(Date.now() / 1000);
        await Delta.create({
            type: "char_rename",
            scenarioId: scenarioId,
            oldName: oldName,
            newName: newName,
            timestamp: timestamp
        });

        
        delete characterLocks[scenarioId][oldName];

        if (Object.keys(characterLocks[scenarioId]).length === 0) {
            delete characterLocks[scenarioId];
        }

        return res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/scenarios/:scenarioId/deltas', async function (req, res) {
    try {
        const scenarioId = req.params.scenarioId;
        const since = parseInt(req.query.since, 10) || 0;

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        
        const { Op } = require('sequelize');
        const deltas = await Delta.findAll({
            where: {
                scenarioId: scenarioId,
                timestamp: {
                    [Op.gt]: since
                }
            },
            order: [['timestamp', 'ASC']]
        });

        
        const formatted = deltas.map(d => {
            if (d.type === "char_rename") {
                return {
                    type: "char_rename",
                    oldName: d.oldName,
                    newName: d.newName,
                    timestamp: d.timestamp
                };
            }

            return {
                type: "line_update",
                lineId: d.lineId,
                nextLineId: d.nextLineId ?? null,
                content: d.content,
                timestamp: d.timestamp
            };
        });

        return res.status(200).json({ deltas: formatted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/scenarios/:scenarioId', async function (req, res) {
    try {
        const scenarioId = req.params.scenarioId;

        
        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        
        const lines = await Line.findAll({
            where: { scenarioId },
            order: [['id', 'ASC']]
        });

        if (!lines || lines.length === 0) {
            return res.status(200).json({
                id: scenario.id,
                title: scenario.title,
                content: []
            });
        }

        
        const lineMap = {};
        lines.forEach(line => {
            lineMap[line.lineId] = line;
        });

        
        const referenced = new Set(
            lines.map(l => l.nextLineId).filter(id => id !== null)
        );

        const firstLine = lines.find(l => !referenced.has(l.lineId));

        
        const orderedContent = [];
        let current = firstLine;

        while (current) {
            orderedContent.push({
                lineId: current.lineId,
                nextLineId: current.nextLineId,
                text: current.text
            });
            current = current.nextLineId !== null ? lineMap[current.nextLineId] : null;
        }

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: orderedContent
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//S4
app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
  const { scenarioId } = req.params;
  const { userId } = req.body; 

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  await Checkpoint.create({
    scenarioId: scenarioId,
    timestamp: Math.floor(Date.now() / 1000)
  });

  res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
});

app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
  const { scenarioId } = req.params;

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  const checkpoints = await Checkpoint.findAll({
    where: { scenarioId },
    attributes: ["id", "timestamp"],
    order: [["timestamp", "ASC"]]
  });

  res.status(200).json(checkpoints);
});

app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
  const { scenarioId, checkpointId } = req.params;

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  const checkpoint = await Checkpoint.findByPk(checkpointId);
  if (!checkpoint || checkpoint.scenarioId != scenarioId) {
    return res.status(404).json({ message: "Checkpoint ne postoji za ovaj scenario!" });
  }

  
  let lines = await Line.findAll({
    where: { scenarioId },
    order: [["lineId", "ASC"]]
  });

  
  let state = lines.map(l => ({
    lineId: l.lineId,
    text: l.text,
    nextLineId: l.nextLineId
  }));

  
  const deltas = await Delta.findAll({
    where: {
      scenarioId,
      timestamp: { [Op.lte]: checkpoint.timestamp }
    },
    order: [["timestamp", "ASC"]]
  });

  
  for (const d of deltas) {
    if (d.type === "line_update") {
      const idx = state.findIndex(l => l.lineId === d.lineId);
      if (idx !== -1) {
        state[idx].text = d.content;
        state[idx].nextLineId = d.nextLineId;
      } else {
        
        state.push({
          lineId: d.lineId,
          text: d.content,
          nextLineId: d.nextLineId
        });
      }
    } else if (d.type === "char_rename") {
      state.forEach(l => {
        if (l.text) {
          const regex = new RegExp(`\\b${d.oldName}\\b`, "g");
          l.text = l.text.replace(regex, d.newName);
        }
      });
    }
  }

  
  const lineMap = {};
  state.forEach(l => (lineMap[l.lineId] = l));

  const referenced = new Set(state.map(l => l.nextLineId).filter(id => id !== null));
  const firstLine = state.find(l => !referenced.has(l.lineId));

  const orderedContent = [];
  let current = firstLine;
  while (current) {
    orderedContent.push(current);
    current = current.nextLineId ? lineMap[current.nextLineId] : null;
  }

  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: orderedContent
  });
});


async function initializeDatabase() {
  try {
    
    await sequelize.sync({ force: true });
    console.log('Baza podataka uspješno inicijalizovana! Tabele su kreirane.');

    
    const scenario = await Scenario.create({ id: 1, title: "Potraga za izgubljenim ključem" });

    
    const linesData = [
      { lineId: 1, nextLineId: 2, text: "NARATOR: Sunce je polako zalazilo nad starim gradom.", scenarioId: 1 },
      { lineId: 2, nextLineId: 3, text: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?", scenarioId: 1 },
      { lineId: 3, nextLineId: 4, text: "BOB: To je posljednje mjesto gdje sam ga vidio prije nego što je pala noć.", scenarioId: 1 },
      { lineId: 4, nextLineId: 5, text: "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata.", scenarioId: 1 },
      { lineId: 5, nextLineId: 6, text: "BOB: Čekaj, čuješ li taj zvuk iza polica?", scenarioId: 1 },
      { lineId: 6, nextLineId: null, text: "NARATOR: Iz sjene se polako pojavila nepoznata figura.", scenarioId: 1 },
    ];
    await Line.bulkCreate(linesData);

    
    const timestampBase = 1736520000;
    const deltasData = [
      { scenarioId: 1, type: "line_update", lineId: 1, nextLineId: 2, content: linesData[0].text, timestamp: timestampBase },
      { scenarioId: 1, type: "line_update", lineId: 2, nextLineId: 3, content: linesData[1].text, timestamp: timestampBase + 10 },
      { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 4, content: linesData[2].text, timestamp: timestampBase + 20 },
      { scenarioId: 1, type: "line_update", lineId: 4, nextLineId: 5, content: linesData[3].text, timestamp: timestampBase + 30 },
      { scenarioId: 1, type: "line_update", lineId: 5, nextLineId: 6, content: linesData[4].text, timestamp: timestampBase + 40 },
      { scenarioId: 1, type: "line_update", lineId: 6, nextLineId: null, content: linesData[5].text, timestamp: timestampBase + 50 },
      { scenarioId: 1, type: "char_rename", oldName: "BOB", newName: "ROBERT", timestamp: timestampBase + 100 },
    ];
    await Delta.bulkCreate(deltasData);

    console.log('Baza je popunjena početnim scenarijem, linijama i deltas.');

  } catch (error) {
    console.error('Greška pri inicijalizaciji baze:', error);
  }
}



app.listen(3000, async () => {
    console.log("Server pokrenut na http://localhost:3000");
    await initializeDatabase();
});

module.exports = app;