module.exports = grammar({
  name: 'futhark',

  rules: {
    source_file: $ => repeat($.dec),

    identifier: $ => /_?[A-Za-z][A-Za-z0-9_\']*/,

    _quals: $ => repeat1(
      seq($.identifier, '.')
    ),

    qualid: $ => prec(9, choice(
      $.identifier,
      seq($._quals, $.identifier)
    )),

    binop: $ => prec.left(seq(
      $.opstartchar,
      repeat($.opchar)
    )),

    qualbinop: $ => choice(
      $.binop,
      seq($._quals, $.binop),
      seq('`', $.qualid, '`')
    ),

    fieldid: $ => choice(
      $._decimal,
      $.identifier
    ),

    opstartchar: $ => choice(
      '+',
      '-',
      '*',
      '/',
      '%',
      '=',
      '!',
      '>',
      '>',
      '|',
      '&',
      '^'
    ),

    opchar: $ => choice(
      $.opstartchar,
      '.'
    ),

    constructor: $ => seq(
      '#',
      $.identifier
    ),

    literal: $ => choice(
      $._intnumber,
      $._floatnumber,
      'true',
      'false'
    ),

    int_type: $ => choice(
      'i8',
      'i16',
      'i32',
      'i64',
      'u8',
      'u16',
      'u32',
      'u64'
    ),

    float_type: $ => choice(
      'f16',
      'f32',
      'f64'
    ),

    _intnumber: $ => seq(
      choice($._decimal,
             $._hexadecimal,
             $._binary),
      optional($.int_type)
    ),

    _decimal: $ => /[0-9][0-9_]*/,

    _hexadecimal: $ => /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,

    _binary: $ => /0[bB][01][01_]*/,

    _floatnumber: $ => seq(
      choice($._pointfloat, $._exponentfloat, $._hexadecimalfloat),
      optional($.float_type)
    ),

    _pointfloat: $ => prec(9, seq(
      optional($._decimal),
      $._fraction
    )),

    _exponentfloat: $ => seq(
      choice($._decimal, $._pointfloat),
      $._exponent
    ),

    _hexadecimalfloat: $ => seq(
      /0[xX]/,
      $._hexintpart,
      $._hexfraction,
      /[pP][\+\-]?[0-9]+/
    ),

    _fraction: $ => /\.[0-9][0-9_]*/,

    _hexintpart: $ => /[0-9a-fA-F][0-9a-fA-F_]*/,

    _hexfraction: $ => /.[0-9a-fA-F][0-9a-fA-F_]*/,

    _exponent: $ => /[eE][\+\-]?[0-9]+/,

    type: $ => choice(
      $.qualid,
      $.array_type,
      $.tuple_type,
      $.record_type,
      $.sum_type,
      $.function_type,
      $.type_application,
      $.existential_size
    ),

    tuple_type: $ => choice(
      seq('(', ')'),
      seq('(', $.type, repeat1(seq(',', $.type)), ')')
    ),

    array_type: $ => seq(
      '[',
      optional($.dim),
      ']',
      $.type
    ),

    dim: $ => choice(
      $.qualid,
      $._decimal
    ),

    sum_type: $ => prec.left(seq(
      $.constructor,
      repeat($.type),
      repeat(seq('|',
                 $.constructor,
                 prec.left(repeat($.type))))
    )),

    record_type: $ => choice(
      seq('{', '}'),
      seq('{',
          $.fieldid,
          ':',
          $.type,
          repeat(seq(',',
                     $.fieldid,
                     ':',
                     $.type)),
          '}')
    ),

    type_application: $ => prec.left(3, choice(
      seq($.type, $.type_arg),
      seq('*', $.type)
    )),

    type_arg: $ => prec.left(choice(
      seq('[', optional($.dim), ']'),
      $.type
    )),

    function_type: $ => prec.right(seq(
      $.param_type,
      '->',
      $.type
    )),

    param_type: $ => prec(2, choice(
      $.type,
      seq('(', $.identifier, ':', $.type, ')')
    )),

    stringlit: $ => token(
      seq('"', repeat(choice(/[^"\\\n]/, seq("\\", /([^\n]|[0-9]+)/))), '"')
    ),

    charlit: $ => token(
      seq('\'', repeat(choice(/[^'\\\n]/, seq("\\", /([^\n]|[0-9]+)/))), '\'')
    ),

    existential_size: $ => seq(
      '?',
      repeat1(seq('[', $.identifier, ']')),
      '.',
      $.type
    ),

    dec: $ => choice(
      $.val_bind,
      $.type_bind,
      // $.mod_bind,
      // $.mod_type_bind,
      // seq('open', $.mod_exp),
      // seq('import', $.stringlit),
      // seq('local', $.dec),
      // seq('#[', $.attr, ']', $.dec),
    ),

    val_bind: $ => seq(
      choice('def', 'entry', 'let'),
      choice(
        $.val_bind1,
        $.val_bind2,
      ),
      optional(seq(':', $.type)),
      '=',
      $.exp,
    ),

    val_bind1: $ => prec(2, seq(
      choice($.identifier, seq('(', $.binop, ')')),
      repeat($.type_param),
      repeat($.pat),
    )),

    val_bind2: $ => prec(0, seq(
      $.pat,
      $.binop,
      $.pat,
    )),

    type_bind: $ => seq(
      'type',
      optional(choice('^', '~')),
      $.identifier,
      repeat($.type_param),
      '=',
      $.type
    ),

    type_param: $ => choice(
      seq('[', $.identifier, ']'),
      seq('\'', $.identifier),
      seq('\'~', $.identifier),
      seq('\'^', $.identifier)
    ),

    atom: $ => prec.left(choice(
      $.literal,
      seq($.qualid, repeat(seq('.', $.fieldid))),
      $.stringlit,
      $.charlit,
      seq('(', ')'),
      seq('(', $.exp, ')', repeat(seq('.', $.fieldid))),
      seq('(', $.exp, repeat(seq(',', $.exp)), ')'),
      seq('{', '}'),
      seq('{', $.field, repeat(seq(',', $.field)), '}'),
      seq($.qualid, '[', $.index, repeat(seq(',', $.index)), ']'),
      seq('(', $.exp, ')', '[', $.index, repeat(seq(',', $.index)), ']'),
      seq($._quals, '.', '(', $.exp, ')'),
      seq('[', $.exp, repeat(seq(',', $.exp)), ']'),
      seq('[', $.exp, optional(seq('..', $.exp)), '...', $.exp, ']'),
      seq('(', $.qualbinop, ')'),
      seq('(', $.exp, $.qualbinop, ')'),
      seq('(', $.qualbinop, $.exp, ')'),
      seq('(', repeat1(seq('.', $.field)), ')'),
      seq('(', '.', '[', $.index, repeat(seq(',', $.index)), ']', ')'),
    )),

    exp: $ => choice(
      $.atom,
      prec.left(4, seq($.exp, $.qualbinop, $.exp)),
      prec.left(4, seq($.exp, $.exp)),
      prec.left(5, seq('!', $.exp)),
      prec.left(6, seq('-', $.exp)),
      prec.left(3, seq($.constructor, repeat($.exp))),
      prec.left(2, seq($.exp, ':', $.type)),
      // seq($.exp, ':>', $.type),
      // seq($.exp, optional(seq('..', $.exp)), '...', $.exp),
      // seq($.exp, optional(seq('..', $.exp)), '..<', $.exp),
      // seq($.exp, optional(seq('..', $.exp)), '..>', $.exp),
      // seq('if', $.exp, 'then', $.exp, 'else', $.exp),
      // seq('let', repeat($.size), $.pat, '=', $.exp, 'in', $.exp),
      // seq('let', $.identifier, '[', $.index, repeat(seq(',', $.index)), ']', '=', $.exp, 'in', $.exp),
      // seq('let', $.identifier, repeat($.type_param), repeat1($.pat), optional(seq(':', $.type)), '=', $.exp, 'in', $.exp),
      // seq('(', '\\', repeat1($.pat), optional(seq('=', $.exp)), $.loopform, 'do', $.exp),
      // seq('#[', $.attr, ']', $.exp),
      // seq('unsafe', $.exp),
      // seq('assert', $.atom, $.atom),
      // seq($.exp, 'with', '[', $.index, repeat(seq(',', $.index)), ']', '=', $.exp),
      // seq($.exp, 'with', $.fieldid, repeat(seq('.', $.fieldid)), '=', $.exp),
      // seq('match', $.exp, repeat1(seq('case', $.pat, '->', $.exp))),
    ),

    index: $ => $.literal,

    loopform: $ => seq(
      'for',
      $.identifier,
      '<',
      $.exp,
    ),

    field: $ => choice(
      seq($.fieldid, '=', $.exp),
      $.identifier
    ),

    size: $ => seq(
      '[', $.identifier, ']'
    ),

    pat: $ => prec.left(1, choice(
      $.identifier,
      $.pat_literal,
      '_',
      seq('(', ')'),
      seq('(', $.pat, ')'),
      seq('(', $.pat, repeat1(seq(',', $.pat)), ')'),
      seq('{', '}'),
      seq('{', $.fieldid, optional(seq('=', $.pat)), repeat(seq(',', $.fieldid, optional(seq('=', $.pat)))), '}'),
      seq($.constructor, repeat($.pat)),
      seq($.pat, ':', $.type),
      seq('#[', $.attr, ']', $.pat),
    )),

    pat_literal: $ => seq(
      optional('-'),
      $._intnumber,
    ),

    mod_bind: $ => seq(
      'module',
      $.identifier,
      repeat($.mod_param),
      '=',
      optional(seq(':', $.mod_type_exp)),
      '=',
      $.mod_exp,
    ),

    mod_param: $ => seq(
      '(',
      $.identifier,
      ':',
      $.mod_type_exp,
      ')',
    ),

    mod_type_bind: $ => seq(
      'module',
      'type',
      $.identifier,
      '=',
      $.mod_type_exp,
    ),

    mod_exp: $ => choice(
      $.qualid,
      seq($.mod_exp, ':', $.mod_type_exp),
      seq('\\', '(', $.identifier, ':', $.mod_type_exp, ')', optional(seq(':', $.mod_type_exp)), '->', $.mod_exp),
      seq($.mod_exp, $.mod_exp),
      seq('(', $.mod_exp, ')'),
      seq('{', repeat($.dec), '}'),
      seq('import', $.stringlit),
    ),

    mod_type_exp: $ => choice(
      $.qualid,
      seq('{', repeat($.spec), '}'),
      seq($.mod_type_exp, 'with', $.qualid, repeat($.type_param), '=', $.type),
      seq('(', $.mod_type_exp, ')'),
      seq('(', $.identifier, ':', $.mod_type_exp, ')', '->', $.mod_type_exp),
      seq($.mod_type_exp, '->', $.mod_type_exp),
    ),

    spec: $ => choice(
      seq('val', $.identifier, repeat($.type_param), ':', $.spec_type),
      seq('val', $.binop, repeat($.type_param), ':', $.spec_type),
      seq('type', optional('^'), $.identifier, repeat($.type_param), '=', $.type),
      seq('type', optional('^'), $.identifier, repeat($.type_param)),
      seq('module', $.identifier, ':', $.mod_type_exp),
      seq('include', $.mod_type_exp),
      seq('#[', $.attr, ']', $.spec),
    ),

    spec_type: $ => choice(
      $.type,
      seq($.type, '->', $.spec_type),
    ),

    attr: $ => choice(
      $.identifier,
      $._decimal,
      seq($.identifier, '(', optional(seq($.attr, repeat(seq(',', $.attr)))), ')'),
    ),
  }
});
