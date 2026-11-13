// DFA-based and regex-based validation for the report identifier.
//
// Report identifier structure (from the spec):
//   BUS[4-digit]-ROUTE[alphabetic code][2-digit]
// Example: BUS1234-ROUTEA12
//
// We validate two parts separately:
//   1. Bus identifier: "BUS" followed by exactly 4 digits.
//   2. Route identifier: "ROUTE" + one or more uppercase letters + exactly 2 digits.
//
// The full combined identifier is "BUSdddd-ROUTELettersDD" and we also expose
// a single-string validator used by the validate endpoint.

export interface ValidationResult {
  valid: boolean;
  identifier: string;
  busId?: string;
  routeId?: string;
  busNumber?: number;
  routePrefix?: string;
  routeNumber?: number;
  method: string;
  errors: string[];
  dfaResult: boolean;
  regexResult: boolean;
  agree: boolean;
}

// ---------------------------------------------------------------------------
// Regex-based validation
// ---------------------------------------------------------------------------

const BUS_REGEX = /^BUS(\d{4})$/;
const ROUTE_REGEX = /^ROUTE([A-Z]+)(\d{2})$/;

export function validateRegex(input: string): {
  busOk: boolean;
  routeOk: boolean;
  busNumber?: number;
  routePrefix?: string;
  routeNumber?: number;
} {
  const parts = input.toUpperCase().split('-');
  if (parts.length !== 2) {
    return { busOk: false, routeOk: false };
  }
  const busMatch = parts[0].match(BUS_REGEX);
  const routeMatch = parts[1].match(ROUTE_REGEX);
  return {
    busOk: !!busMatch,
    routeOk: !!routeMatch,
    busNumber: busMatch ? Number(busMatch[1]) : undefined,
    routePrefix: routeMatch ? routeMatch[1] : undefined,
    routeNumber: routeMatch ? Number(routeMatch[2]) : undefined,
  };
}

// ---------------------------------------------------------------------------
// DFA-based validation
// ---------------------------------------------------------------------------
// A deterministic finite automaton that accepts exactly:
//   B U S d d d d - R O U T E L+ d d
// where d is a digit and L is an uppercase letter.

type DFAResult = { accepted: boolean; bus: string; route: string };

function runDFA(input: string): DFAResult {
  const s = input.toUpperCase();
  let state = 0;
  let bus = '';
  let route = '';
  let digitCount = 0;

  // States:
  // 0  expect 'B'
  // 1  expect 'U'
  // 2  expect 'S'
  // 3-6  four bus digits
  // 7  expect '-'
  // 8  expect 'R'
  // 9  expect 'O'
  // 10 expect 'U'
  // 11 expect 'T'
  // 12 expect 'E'
  // 13 one or more letters
  // 14-15 two route digits
  // 16 accept

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    switch (state) {
      case 0: if (ch === 'B') state = 1; else return fail(); break;
      case 1: if (ch === 'U') state = 2; else return fail(); break;
      case 2: if (ch === 'S') state = 3; else return fail(); break;
      case 3: case 4: case 5: case 6:
        if (/[0-9]/.test(ch)) {
          bus += ch;
          digitCount++;
          state = digitCount >= 4 ? 7 : state + 1;
        } else return fail();
        break;
      case 7: if (ch === '-') state = 8; else return fail(); break;
      case 8: if (ch === 'R') state = 9; else return fail(); break;
      case 9: if (ch === 'O') state = 10; else return fail(); break;
      case 10: if (ch === 'U') state = 11; else return fail(); break;
      case 11: if (ch === 'T') state = 12; else return fail(); break;
      case 12: if (ch === 'E') state = 13; else return fail(); break;
      case 13:
        if (/[A-Z]/.test(ch)) { route += ch; state = 14; }
        else return fail();
        break;
      case 14:
        if (/[A-Z]/.test(ch)) { route += ch; }
        else if (/[0-9]/.test(ch)) { route += ch; state = 15; }
        else return fail();
        break;
      case 15:
        if (/[0-9]/.test(ch)) { route += ch; state = 16; }
        else return fail();
        break;
      case 16: return fail(); // extra characters
      default: return fail();
    }
  }

  function fail(): DFAResult {
    return { accepted: false, bus: '', route: '' };
  }

  return {
    accepted: state === 16,
    bus,
    route,
  };
}

export function validateDFA(input: string): boolean {
  return runDFA(input).accepted;
}

// ---------------------------------------------------------------------------
// Combined validation API
// ---------------------------------------------------------------------------

export function validateIdentifier(input: string): ValidationResult {
  const trimmed = input.trim();
  const errors: string[] = [];

  if (!trimmed) {
    return {
      valid: false,
      identifier: input,
      errors: ['Identifier is empty.'],
      dfaResult: false,
      regexResult: false,
      agree: true,
      method: 'dfa+regex',
    };
  }

  const dfa = runDFA(trimmed);
  const rx = validateRegex(trimmed);

  if (!dfa.accepted) {
    if (!trimmed.toUpperCase().startsWith('BUS')) {
      errors.push('Identifier must start with "BUS".');
    }
    if (!trimmed.includes('-')) {
      errors.push('Missing "-" separator between bus and route parts.');
    }
    const parts = trimmed.toUpperCase().split('-');
    if (parts.length === 2) {
      if (!BUS_REGEX.test(parts[0])) {
        errors.push('Bus part must be "BUS" followed by exactly 4 digits (e.g. BUS1234).');
      }
      if (!ROUTE_REGEX.test(parts[1])) {
        errors.push('Route part must be "ROUTE" + letters + 2 digits (e.g. ROUTEA12).');
      }
    }
    if (parts.length > 2) {
      errors.push('Identifier contains multiple "-" characters; expected exactly one separator.');
    }
  }

  const valid = dfa.accepted && rx.busOk && rx.routeOk;
  const busId = valid ? `BUS${String(rx.busNumber).padStart(4, '0')}` : undefined;
  const routeId = valid ? `ROUTE${rx.routePrefix}${String(rx.routeNumber).padStart(2, '0')}` : undefined;

  return {
    valid,
    identifier: trimmed,
    busId,
    routeId,
    busNumber: rx.busNumber,
    routePrefix: rx.routePrefix,
    routeNumber: rx.routeNumber,
    errors,
    dfaResult: dfa.accepted,
    regexResult: rx.busOk && rx.routeOk,
    agree: dfa.accepted === (rx.busOk && rx.routeOk),
    method: 'dfa+regex',
  };
}
