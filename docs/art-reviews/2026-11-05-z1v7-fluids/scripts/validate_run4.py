"""Record actual command exits; technical checks do not certify art acceptance."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', choices=['measurements', 'delivery'], required=True)
    args = parser.parse_args()
    commands = [
        ['measure_shore.py'], ['audit_particle_coverage.py'],
        ['check_loop_metrics.py'],
    ] if args.stage == 'measurements' else [
        ['check_reference_union.py'], ['check_shore_regression.py'],
        ['audit_run4.py'], ['verify_delivery.py'],
    ]
    rows = []
    for command in commands:
        process = subprocess.run([sys.executable, str(ROOT / 'scripts' / command[0]), *command[1:]],
                                 capture_output=True, text=True)
        expected = 1 if command[0] == 'verify_delivery.py' else 0
        rows.append({'command': command, 'exitCode': process.returncode, 'expectedExitCode': expected,
                     'stdout': process.stdout, 'stderr': process.stderr})
        report = {
            'stage': args.stage, 'commands': rows,
            'allCommandExitsAsExpected': all(row['exitCode'] == row['expectedExitCode'] for row in rows),
            'acceptanceComplete': False, 'notHumanQA': True,
        }
        (ROOT / 'review' / ('run4-' + args.stage + '-commands.json')).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(command[0], 'exit', process.returncode, 'expected', expected, flush=True)
        if process.returncode != expected:
            print(process.stderr or process.stdout, flush=True)
            return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
