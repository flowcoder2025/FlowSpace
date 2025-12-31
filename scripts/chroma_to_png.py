#!/usr/bin/env python3
"""
Chroma Key to PNG Converter for Pixel Art Sprites

Converts JPEG spritesheets with magenta (#FF00FF) background to PNG with alpha.
Designed for pixel art - NO resizing, blur, or anti-aliasing.

Usage:
    python chroma_to_png.py --in ./in --out ./out --key "#FF00FF" --tol 40 --erode 1

Requirements:
    pip install Pillow numpy

Author: FlowSpace Team
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install Pillow numpy")
    sys.exit(1)


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color string to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def color_distance(img_array: np.ndarray, key_rgb: tuple) -> np.ndarray:
    """Calculate Euclidean color distance from chroma key for each pixel."""
    rgb = img_array[:, :, :3].astype(np.float32)
    key = np.array(key_rgb, dtype=np.float32)
    diff = rgb - key
    return np.sqrt(np.sum(diff ** 2, axis=2))


def create_alpha_mask(distance: np.ndarray, tolerance: int) -> np.ndarray:
    """Create binary alpha mask. No gradient for pixel art."""
    return np.where(distance <= tolerance, 0, 255).astype(np.uint8)


def erode_alpha(mask: np.ndarray, iterations: int) -> np.ndarray:
    """Erode alpha mask to remove halo artifacts (3x3 minimum filter)."""
    if iterations <= 0:
        return mask

    result = mask.copy()
    for _ in range(iterations):
        padded = np.pad(result, 1, mode='edge')
        result = np.minimum.reduce([
            padded[0:-2, 0:-2], padded[0:-2, 1:-1], padded[0:-2, 2:],
            padded[1:-1, 0:-2], padded[1:-1, 1:-1], padded[1:-1, 2:],
            padded[2:, 0:-2], padded[2:, 1:-1], padded[2:, 2:],
        ])
    return result


def dilate_alpha(mask: np.ndarray, iterations: int) -> np.ndarray:
    """Dilate alpha mask to restore size after erosion (3x3 maximum filter)."""
    if iterations <= 0:
        return mask

    result = mask.copy()
    for _ in range(iterations):
        padded = np.pad(result, 1, mode='edge')
        result = np.maximum.reduce([
            padded[0:-2, 0:-2], padded[0:-2, 1:-1], padded[0:-2, 2:],
            padded[1:-1, 0:-2], padded[1:-1, 1:-1], padded[1:-1, 2:],
            padded[2:, 0:-2], padded[2:, 1:-1], padded[2:, 2:],
        ])
    return result


def process_image(
    input_path: Path,
    output_path: Path,
    key_rgb: tuple,
    tolerance: int,
    erode: int,
    dilate: int,
    verbose: bool = False
) -> bool:
    """Process single image: remove chroma key, save as PNG with alpha."""
    try:
        img = Image.open(input_path)

        if verbose:
            print(f"  Processing: {input_path.name} ({img.width}x{img.height})")

        if img.mode != 'RGB':
            img = img.convert('RGB')

        img_array = np.array(img)

        # Create alpha mask based on color distance
        distance = color_distance(img_array, key_rgb)
        alpha = create_alpha_mask(distance, tolerance)

        # Edge cleanup
        if erode > 0:
            alpha = erode_alpha(alpha, erode)
        if dilate > 0:
            alpha = dilate_alpha(alpha, dilate)

        # Combine RGB + Alpha
        rgba_array = np.dstack([img_array, alpha])
        result = Image.fromarray(rgba_array, mode='RGBA')

        # Save PNG
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result.save(output_path, 'PNG', optimize=False)

        if verbose:
            print(f"    Saved: {output_path.name}")

        return True
    except Exception as e:
        print(f"  ERROR: {input_path.name} - {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Convert JPEG sprites with chroma key to PNG with alpha.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage
    python chroma_to_png.py --in ./sprites_jpeg --out ./sprites_png

    # With tolerance for JPEG artifacts
    python chroma_to_png.py --in ./in --out ./out --tol 50

    # With edge cleanup (erode removes halo, dilate restores size)
    python chroma_to_png.py --in ./in --out ./out --erode 1 --dilate 1

    # Single file
    python chroma_to_png.py --in sprite.jpg --out sprite.png

Verification after conversion:
    1. File is PNG with alpha channel (RGBA mode)
    2. Background is fully transparent (alpha=0)
    3. No magenta halo around character edges
    4. Dimensions match original (192x256)
    5. Pixel edges are sharp, no blur/anti-aliasing
        """
    )

    parser.add_argument('--in', '-i', dest='input', required=True,
                        help='Input file or directory')
    parser.add_argument('--out', '-o', dest='output', required=True,
                        help='Output file or directory')
    parser.add_argument('--key', '-k', default='#FF00FF',
                        help='Chroma key color (default: #FF00FF)')
    parser.add_argument('--tol', '-t', type=int, default=40,
                        help='Color tolerance 0-100 (default: 40)')
    parser.add_argument('--erode', '-e', type=int, default=0,
                        help='Erosion iterations for halo removal (default: 0)')
    parser.add_argument('--dilate', '-d', type=int, default=0,
                        help='Dilation iterations after erosion (default: 0)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Verbose output')

    args = parser.parse_args()

    try:
        key_rgb = hex_to_rgb(args.key)
    except ValueError:
        print(f"Error: Invalid hex color '{args.key}'")
        sys.exit(1)

    if not 0 <= args.tol <= 255:
        print(f"Error: Tolerance must be 0-255")
        sys.exit(1)

    input_path = Path(args.input)
    output_path = Path(args.output)

    print(f"Chroma Key → PNG Converter")
    print(f"  Key: {args.key} = RGB{key_rgb}")
    print(f"  Tolerance: {args.tol}, Erode: {args.erode}, Dilate: {args.dilate}")
    print()

    if input_path.is_file():
        # Single file
        if output_path.suffix.lower() != '.png':
            output_path = output_path.with_suffix('.png')

        success = process_image(input_path, output_path, key_rgb,
                                args.tol, args.erode, args.dilate, args.verbose)
        if success:
            print(f"\nDone! → {output_path}")
        else:
            sys.exit(1)

    elif input_path.is_dir():
        # Directory batch
        output_path.mkdir(parents=True, exist_ok=True)

        extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        files = [f for f in input_path.iterdir()
                 if f.is_file() and f.suffix.lower() in extensions]

        if not files:
            print(f"No image files in {input_path}")
            sys.exit(1)

        print(f"Processing {len(files)} files...")

        success = fail = 0
        for f in sorted(files):
            out_file = output_path / (f.stem + '.png')
            if process_image(f, out_file, key_rgb, args.tol,
                             args.erode, args.dilate, args.verbose):
                success += 1
            else:
                fail += 1

        print(f"\nDone! Success: {success}, Failed: {fail}")
        print(f"Output: {output_path}")

        if fail > 0:
            sys.exit(1)
    else:
        print(f"Error: Path not found: {input_path}")
        sys.exit(1)


if __name__ == '__main__':
    main()
