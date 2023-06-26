const PREC = {
  match: 2
  seq: 3,
  if: 4,
  assign: 5,
  prod: 6,
  or: 7,
  and: 8,
  rel: 9,
  bit: 10,
  shift: 11,
  concat: 12,
  cons: 13,
  add: 14,
  mult: 15,
  pow: 16,
  neg: 17,
  app: 18,
  hash: 19,
  dot: 20,
  prefix: 21,
}

const OP_START_CHAR = /[!%&*+-/<=>^|]/
const OP_CHAR = /[!%&*+-/<=>^|.]/
const NUMBER = token(choice(
  /[0-9][0-9_]*(\.[0-9_]*)?([eE][+\-]?[0-9][0-9_]*)?/,
  /0[xX][0-9A-Fa-f][0-9A-Fa-f_]*(\.[0-9A-Fa-f_]*)?/,
  /0[bB][01][01_]*/
))

module.exports = grammar({
  name: 'futhark',

  rules: {
    source_file: $ => repeat($._declaration),

    _declaration: $ => choice(
      $.value_bind,
    ),

    value_bind: $ => seq(
      choice('def', 'entry', 'let'),
      $.identifier,
      repeat($.pat),
      '=',
      field('body', $._expression),
    ),

    pat: $ => $.identifier,

    _atom: $ => choice(
      $.identifier,
      $.number,
      seq('(', $._expression, ')'),
    ),

    _expression: $ => choice(
      $._atom,
      $.application_expression,
      $.infix_expression,
      $.sign_expression,
    ),

    application_expression: $ => prec.right(PREC.app, seq(
      field('function', $._atom),
      repeat1(field('argument', $._atom)),
    )),

    unary_expression: $ => prec.left(PREC.neg, choice(
      seq('-', $._expression),
      seq('!', $._expression),
    )),

    prefix_operator: $ => token('!'),

    sign_operator: $ => '-',

    prefix_expression: $ => prec(PREC.prefix, seq(
      $.prefix_operator,
      field('right', $._atom)
    )),

    sign_expression: $ => prec(PREC.neg, seq(
      $.sign_operator,
      field('right', $._expression)
    )),

    infix_expression: $ => {
      const table = [
        {
          operator: $._pow_operator,
          precedence: PREC.pow,
          associativity: 'right'
        },
        {
          operator: $._mult_operator,
          precedence: PREC.mult,
          associativity: 'left'
        },
        {
          operator: $._add_operator,
          precedence: PREC.add,
          associativity: 'left'
        },
        {
          operator: $._concat_operator,
          precedence: PREC.concat,
          associativity: 'right'
        },
        {
          operator: $._rel_operator,
          precedence: PREC.rel,
          associativity: 'left'
        },
        {
          operator: $._and_operator,
          precedence: PREC.and,
          associativity: 'right'
        },
        {
          operator: $._or_operator,
          precedence: PREC.or,
          associativity: 'right'
        },
        {
          operator: $._assign_operator,
          precedence: PREC.assign,
          associativity: 'right'
        }
      ]

      return choice(...table.map(({operator, precedence, associativity}) =>
        prec[associativity](precedence, seq(
          field('left', $._expression),
          alias(operator, $.infix_operator),
          field('right', $._expression)
        ))
      ))
    },

    _pow_operator: $ => choice(
      token(seq('**', repeat(OP_CHAR))),
      'lsl', 'lsr', 'asr'
    ),

    _mult_operator: $ => choice(
      token(seq(/[*/%]/, repeat(OP_CHAR))),
      'mod', 'land', 'lor', 'lxor'
    ),

    _add_operator: $ => choice(
      '+', '-', '+.', '-.',
      token(choice(
        seq('+', repeat1(OP_CHAR)),
        seq('-', choice(repeat1(/[!$%&*+\-./:<=?@^|~]/), repeat2(OP_CHAR)))
      ))
    ),

    _concat_operator: $ => token(
      seq(/[@^]/, repeat(OP_CHAR))
    ),

    _rel_operator: $ => token(choice(
      seq(/[=>$]/, repeat(OP_CHAR)),
      seq('<', choice(optional(/[!$%&*+./:<=>?@^|~]/), repeat2(OP_CHAR))),
      seq('&', choice(/[!$%*+\-./:<=>?@^|~]/, repeat2(OP_CHAR))),
      seq('|', choice(/[!$%&*+\-./:<=>?@^~]/, repeat2(OP_CHAR))),
      '!='
    )),

    _and_operator: $ => choice('&', '&&'),

    _or_operator: $ => choice('or', '||'),

    _assign_operator: $ => choice(':='),

    identifier: $ => /[a-z]+/,

    number: $ => /\d+/,
  }
});

function repeat2(rule) {
  return seq(rule, repeat1(rule))
}
