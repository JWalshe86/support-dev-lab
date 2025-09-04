(function () {
  console.log('hot reload OK');

  // Backbone: notes list from Postgres
  var Note = Backbone.Model.extend({});
  var Notes = Backbone.Collection.extend({
    model: Note,
    url: '/api/notes'
  });
  var notes = new Notes();

  function renderNotes() {
    var $list = $('#notes').empty();
    notes.each(function (n) {
      var txt = n.get('text') || n.get('body') || '';
      $list.append(
        $('<li class="list-group-item d-flex justify-content-between align-items-center"></li>')
          .text(txt)
      );
    });
  }

  // Add note -> POST /api/notes with {text}
  $('#noteForm').on('submit', function (e) {
    e.preventDefault();
    var text = ($('#noteBody').val() || '').trim();
    if (!text) return;
    $.ajax({
      url: '/api/notes',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ text })
    })
      .done(function () {
        $('#noteBody').val('');
        notes.fetch({ reset: true }).done(renderNotes);
      })
      .fail(function (xhr) {
        alert('Add note failed: ' + (xhr.responseText || xhr.statusText));
      });
  });

  // Seed ES
  $('#seed').on('click', function () {
    $.post('/api/search/seed')
      .done(function (j) {
        var n = (j && typeof j.seeded === 'number') ? j.seeded : 'some';
        alert('Seeded ' + n + ' docs');
      })
      .fail(function (xhr) { alert('Seed failed: ' + (xhr.responseText || xhr.statusText)); });
  });

  // Cache
  $('#cache').on('click', function () {
    $.get('/api/cache')
      .done(function (r) { alert('Cache hits: ' + r.hits); })
      .fail(function (xhr) { alert('Cache failed: ' + (xhr.responseText || xhr.statusText)); });
  });

  // DB time
  $('#db').on('click', function () {
    $.get('/api/db/time')
      .done(function (r) { alert('DB time: ' + r.now); })
      .fail(function (xhr) { alert('DB failed: ' + (xhr.responseText || xhr.statusText)); });
  });

  // Search (accepts array or {hits:[...]})
  $('#search').on('click', function () {
    var q = $('#q').val() || '';
    $.get('/api/search', { q })
      .done(function (j) {
        var hits = Array.isArray(j) ? j : (j && j.hits) ? j.hits : [];
        var $list = $('#results').empty();
        hits.forEach(function (h) {
          var msg = h.text || h.body || JSON.stringify(h);
          var score = (typeof h.score === 'number') ? '(' + h.score.toFixed(2) + ') ' : '';
          $list.append($('<li class="list-group-item"></li>').text(score + msg));
        });
      })
      .fail(function (xhr) {
        console.error('search failed', xhr.responseText || xhr.statusText);
        alert('Search failed');
      });
  });

  // initial load
  notes.fetch({ reset: true }).done(renderNotes);
})();
