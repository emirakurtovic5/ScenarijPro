const PoziviAjaxFetch = (function () {
  
const BASE_URL = "http://localhost:3000/api";

  function handleResponse(response, callback) {
    response
      .json()
      .then(data => callback(response.status, data))
      .catch(() => callback(response.status, null));
  }

  function handleError(error, callback) {
    console.error("AJAX greška:", error);
    callback(0, { message: "Greška u komunikaciji sa serverom" });
  }

  return {

    // POST /api/scenarios
    postScenario: function (title, callback) {
      fetch(`${BASE_URL}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      })
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // POST /api/scenarios/:scenarioId/lines/:lineId/lock
    lockLine: function (scenarioId, lineId, userId, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // PUT /api/scenarios/:scenarioId/lines/:lineId
    updateLine: function (scenarioId, lineId, userId, newText, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newText
        })
      })
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // POST /api/scenarios/:scenarioId/characters/lock
    lockCharacter: function (scenarioId, characterName, userId, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}/characters/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, characterName })
      })
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // POST /api/scenarios/:scenarioId/characters/update
    updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}/characters/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, oldName, newName })
      })
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // GET /api/scenarios/:scenarioId/deltas?since=...
    getDeltas: function (scenarioId, since, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}/deltas?since=${since}`)
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    },

    // GET /api/scenarios/:scenarioId
    getScenario: function (scenarioId, callback) {
      fetch(`${BASE_URL}/scenarios/${scenarioId}`)
        .then(res => handleResponse(res, callback))
        .catch(err => handleError(err, callback));
    }

  };
})();
