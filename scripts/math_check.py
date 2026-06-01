#!/usr/bin/env python3
"""Symbolic and numeric equivalence check for MathPilot (SymPy)."""
import json
import sys
from typing import Any

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
except ImportError:
    print(json.dumps({"ok": False, "error": "sympy_not_installed"}))
    sys.exit(1)

TRANSFORMS = standard_transformations + (implicit_multiplication_application,)


def normalize(s: str) -> str:
    return (
        s.lower()
        .replace("^", "**")
        .replace("{", "(")
        .replace("}", ")")
        .replace(" ", "")
        .replace("\\cdot", "*")
    )


def parse_math(expr: str):
    expr = normalize(expr)
    return parse_expr(expr, transformations=TRANSFORMS)


def numeric_probe(expected, actual, variables: list[str]) -> bool:
    subs = {}
    for i, v in enumerate(variables or ["x"]):
        subs[sp.Symbol(v)] = [-2.3, -0.7, 0.6, 1.8, 3.1][i % 5]
    try:
        diff = abs(float((expected - actual).subs(subs).evalf()))
        return diff < 1e-6
    except Exception:
        return False


def verify_derivative(expression: str, expected_derivative: str, variable: str = "x") -> dict[str, Any]:
    """Check that d/d(variable) expression equals expected_derivative."""
    try:
        v = sp.Symbol(variable)
        expr = parse_math(expression)
        computed = sp.diff(expr, v)
        expected = parse_math(expected_derivative)
        if sp.simplify(computed - expected) == 0:
            return {"ok": True, "correct": True, "method": "symbolic", "feedback": "Derivative verification passed."}
        return {
            "ok": True,
            "correct": False,
            "method": "symbolic",
            "feedback": f"Derivative mismatch: got {computed}, expected {expected}.",
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex), "correct": False, "method": "text", "feedback": "Derivative verification failed."}


def verify_integral(expression: str, expected_integral: str, variable: str = "x") -> dict[str, Any]:
    """Check that ∫ expression d(variable) matches expected_integral (+C ignored)."""
    try:
        v = sp.Symbol(variable)
        expr = parse_math(expression)
        computed = sp.integrate(expr, v)
        expected = parse_math(expected_integral)
        if sp.simplify(sp.diff(computed, v) - expr) == 0 and sp.simplify(sp.diff(expected, v) - expr) == 0:
            return {"ok": True, "correct": True, "method": "symbolic", "feedback": "Integral verification passed."}
        if sp.simplify(computed - expected) == 0:
            return {"ok": True, "correct": True, "method": "symbolic", "feedback": "Integral verification passed."}
        return {
            "ok": True,
            "correct": False,
            "method": "symbolic",
            "feedback": "Integral form does not match expected antiderivative.",
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex), "correct": False, "method": "text", "feedback": "Integral verification failed."}


def check(expected: str, actual: str, variables: list[str] | None = None) -> dict[str, Any]:
    variables = variables or ["x"]
    if not actual.strip():
        return {"ok": True, "correct": False, "method": "text", "feedback": "Enter an answer first."}
    try:
        e = parse_math(expected)
        a = parse_math(actual)
        if sp.simplify(e - a) == 0:
            return {"ok": True, "correct": True, "method": "symbolic", "feedback": "Equivalent form accepted."}
        if numeric_probe(e, a, variables):
            return {"ok": True, "correct": True, "method": "numeric", "feedback": "Equivalent form accepted."}
        return {
            "ok": True,
            "correct": False,
            "method": "symbolic",
            "feedback": "This does not match the expected answer. Check your setup before simplifying.",
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex), "correct": False, "method": "text", "feedback": "Could not parse expression."}


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    op = payload.get("operation", "equivalence")
    if op == "verify_derivative":
        result = verify_derivative(
            payload.get("expression", ""),
            payload.get("expected_derivative", ""),
            payload.get("variable", "x"),
        )
    elif op == "verify_integral":
        result = verify_integral(
            payload.get("expression", ""),
            payload.get("expected_integral", ""),
            payload.get("variable", "x"),
        )
    else:
        result = check(
            payload.get("expected", ""),
            payload.get("actual", ""),
            payload.get("variables"),
        )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
