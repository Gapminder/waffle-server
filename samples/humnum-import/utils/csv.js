exports.parse = function parse(csv) {
  var chars = csv.split('');
  var c = 0;
  var cc = chars.length;
  var start, end;
  var table = [];
  var row;

  while (c < cc) {
    row = [];
    table.push(row);

    while (c < cc && '\r' !== chars[c] && '\n' !== chars[c]) {
      start = end = c;

      if ('"' === chars[c]) {
        start = end = ++c;

        while (c < cc) {
          if ('"' === chars[c]) {
            if ('"' !== chars[c + 1]) {
              break;
            } else {
              chars[++c] = '';
            }
          }

          end = ++c;
        }

        if ('"' === chars[c]) {
          ++c;
        }

        while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) {
          ++c;
        }
      } else {
        while (c < cc && '\r' !== chars[c] && '\n' !== chars[c] && ',' !== chars[c]) {
          end = ++c;
        }
      }

      row.push(chars.slice(start, end).join(''));

      if (',' === chars[c]) {
        ++c;
      }
    }

    if ('\r' === chars[c]) {
      ++c;
    }

    if ('\n' === chars[c]) {
      ++c;
    }
  }
  return table;
};
