"use strict";
const utils = {
    'isFirstLetterUppercase': (input) => (!!input && input[0] >= 'A' && input[0] <= 'Z'),
    'uppercaseIfNeeded': (input, ucase) => (ucase ? input.toUpperCase() : input),
    'pad': (num, width = 2) => {
        let a = num.toString(16);
        return ('0000000000' + a).substr(-Math.max(width, a.length)).toUpperCase();
    }
};
module.exports = utils;
//# sourceMappingURL=utils.js.map