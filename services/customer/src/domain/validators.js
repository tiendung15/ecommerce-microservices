const { invalid } = require('../shared/errors');

function validateFullname(fullname) {
  const v = (fullname || '').trim();
  if (!v) throw invalid('fullname must not be empty');
  if (v.length > 100) throw invalid('fullname must be at most 100 characters');
  return v;
}

module.exports = { validateFullname };
