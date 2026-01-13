const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const DATA_DIR = path.join(__dirname, "data");
const SCENARIOS_DIR = path.join(DATA_DIR, "scenarios");

app.post('/api/scenarios', function(req, res){
    let { title } = req.body;

    if (!title || title.trim() === "") {
        title = "Neimenovani scenarij";
    }

    const files = fs.readdirSync(SCENARIOS_DIR);
    const newId = files.length + 1;

    const scenario = {
        id: newId,
        title: title,
        content: [
            {
                lineId: 1,
                nextLineId: null,
                text: ""
            }
        ]
    };

    const filePath = path.join(SCENARIOS_DIR, `scenario-${newId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));

    res.status(200).json(scenario);
});


const userLocks = {};

app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', function(req, res){
  
  
  const scenarioId = req.params.scenarioId;
  const lineId = parseInt(req.params.lineId);
  
  
  const { userId } = req.body;
  
 
  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);
  
  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }
  
  
  const scenarioData = fs.readFileSync(scenarioPath, 'utf-8');
  const scenario = JSON.parse(scenarioData);
  
  
  const line = scenario.content.find(l => l.lineId === lineId);
  
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
app.put('/api/scenarios/:scenarioId/lines/:lineId', function(req, res){
  
  const scenarioId = req.params.scenarioId;
  const lineId = parseInt(req.params.lineId);
  const { userId, newText } = req.body;
  
  if (!newText || !Array.isArray(newText) || newText.length === 0) {
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
  }
  
  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);
  
  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }
  
  const scenarioData = fs.readFileSync(scenarioPath, 'utf-8');
  const scenario = JSON.parse(scenarioData);
  
  const lineIndex = scenario.content.findIndex(l => l.lineId === lineId);
  
  if (lineIndex === -1) {
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
  
  let maxLineId = Math.max(...scenario.content.map(l => l.lineId));
  const originalNextLineId = scenario.content[lineIndex].nextLineId;
  const oldText = scenario.content[lineIndex].text;
  
  scenario.content[lineIndex].text = allLines[0];
  
  
  const deltasPath = path.join(DATA_DIR, 'deltas.json');
  let deltas = [];
  
  if (fs.existsSync(deltasPath)) {
    try {
      const deltasData = fs.readFileSync(deltasPath, 'utf-8').trim();
      if (deltasData) {
        deltas = JSON.parse(deltasData);
      }
    } catch (error) {
      console.error('Greška pri čitanju deltas.json:', error);
      deltas = [];
    }
  }
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  
  deltas.push({
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
      
      newLinesToInsert.push({
        lineId: maxLineId,
        nextLineId: newNextLineId,
        text: allLines[i]
      });
      
      
      deltas.push({
        scenarioId: parseInt(scenarioId),
        type: "line_update",
        lineId: maxLineId,
        nextLineId: newNextLineId,
        content: allLines[i],
        timestamp: timestamp
      });
    }
    
    scenario.content[lineIndex].nextLineId = newLinesToInsert[0].lineId;
    scenario.content.splice(lineIndex + 1, 0, ...newLinesToInsert);
  } else {
    scenario.content[lineIndex].nextLineId = originalNextLineId;
  }
  
  fs.writeFileSync(deltasPath, JSON.stringify(deltas, null, 2));
  fs.writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2));
  
  delete userLocks[userId];
  
  res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

const characterLocks = {};

app.post('/api/scenarios/:scenarioId/characters/lock', function(req, res){
  
  const scenarioId = req.params.scenarioId;
  const { userId, characterName } = req.body;

  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);

  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  if (!characterLocks[scenarioId]) {
    characterLocks[scenarioId] = {};
  }

  if (characterLocks[scenarioId][characterName]) {
    return res
      .status(409)
      .json({ message: "Konflikt! Ime lika je vec zakljucano!" });
  }

  characterLocks[scenarioId][characterName] = userId;

  return res
    .status(200)
    .json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post('/api/scenarios/:scenarioId/characters/update', function(req, res){

  const scenarioId = req.params.scenarioId;
  const { userId, oldName, newName } = req.body;

  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);

  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  if (
    !characterLocks[scenarioId] ||
    characterLocks[scenarioId][oldName] !== userId
  ) {
    return res
      .status(409)
      .json({ message: "Ime lika nije zakljucano!" });
  }

  const scenarioData = fs.readFileSync(scenarioPath, "utf-8");
  const scenario = JSON.parse(scenarioData);

  scenario.content.forEach(line => {
    if (line.text) {
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      line.text = line.text.replace(regex, newName);
    }
  });

  const deltasPath = path.join(DATA_DIR, "deltas.json");
  let deltas = [];

  if (fs.existsSync(deltasPath)) {
    const deltasData = fs.readFileSync(deltasPath, "utf-8").trim();
    deltas = deltasData ? JSON.parse(deltasData) : [];
  }

  const timestamp = Math.floor(Date.now() / 1000);

  deltas.push({
    type: "char_rename",
    scenarioId: scenarioId,
    userId: userId,
    oldName: oldName,
    newName: newName,
    timestamp: timestamp
  });

  fs.writeFileSync(deltasPath, JSON.stringify(deltas, null, 2));
  fs.writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2));

  delete characterLocks[scenarioId][oldName];

  if (Object.keys(characterLocks[scenarioId]).length === 0) {
    delete characterLocks[scenarioId];
  }

  return res
    .status(200)
    .json({ message: "Ime lika je uspjesno promijenjeno!" });
});
app.get('/api/scenarios/:scenarioId/deltas', function (req, res) {

  const scenarioId = req.params.scenarioId;
  const since = parseInt(req.query.since, 10);

  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);

  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  const deltasPath = path.join(DATA_DIR, "deltas.json");

  if (!fs.existsSync(deltasPath)) {
    return res.status(200).json({ deltas: [] });
  }

  const deltasData = fs.readFileSync(deltasPath, "utf-8").trim();
  const allDeltas = deltasData ? JSON.parse(deltasData) : [];

  const filtered = allDeltas
    .filter(d =>
      d.scenarioId == scenarioId &&
      d.timestamp > since
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(d => {
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

  return res.status(200).json({ deltas: filtered });
});


app.get('/api/scenarios/:scenarioId', function (req, res) {

  const scenarioId = req.params.scenarioId;
  const scenarioPath = path.join(SCENARIOS_DIR, `scenario-${scenarioId}.json`);

  if (!fs.existsSync(scenarioPath)) {
    return res.status(404).json({ message: "Scenario ne postoji!" });
  }

  const scenarioData = fs.readFileSync(scenarioPath, 'utf-8');
  const scenario = JSON.parse(scenarioData);

  if (!scenario.content || scenario.content.length === 0) {
    return res.status(200).json({
      id: scenario.id,
      title: scenario.title,
      content: []
    });
  }

  const lineMap = {};
  scenario.content.forEach(line => {
    lineMap[line.lineId] = line;
  });

  const referenced = new Set(
    scenario.content
      .map(l => l.nextLineId)
      .filter(id => id !== null)
  );

  const firstLine = scenario.content.find(l => !referenced.has(l.lineId));

  const orderedContent = [];
  let current = firstLine;

  while (current) {
    orderedContent.push(current);
    current = current.nextLineId !== null
      ? lineMap[current.nextLineId]
      : null;
  }

  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: orderedContent
  });
});

app.listen(3000, () => {
  console.log("Server pokrenut na http://localhost:3000");
});
