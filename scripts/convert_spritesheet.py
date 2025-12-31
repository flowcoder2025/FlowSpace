#!/usr/bin/env python3
"""
Spritesheet Converter with Chroma Key Removal

Converts various spritesheet formats to Phaser-compatible PNG with alpha.
Supports 8x4, 4x4 grids and custom configurations.

Usage:
    # Auto-detect and convert with chroma key removal
    python convert_spritesheet.py --in sprite.jpg --out sprite.png

    # Specify grid format
    python convert_spritesheet.py --in sprite.jpg --out sprite.png --cols 8 --rows 4

    # Convert 8x4 to 4x4 (sample every 2nd frame)
    python convert_spritesheet.py --in sprite.jpg --out sprite.png --target-cols 4

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
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def remove_chroma_key(img_array: np.ndarray, key_rgb: tuple, tolerance: int) -> np.ndarray:
    """Remove chroma key background and return RGBA array."""
    rgb = img_array[:, :, :3].astype(np.float32)
    key = np.array(key_rgb, dtype=np.float32)

    # Euclidean color distance
    diff = rgb - key
    distance = np.sqrt(np.sum(diff ** 2, axis=2))

    # Binary alpha mask
    alpha = np.where(distance <= tolerance, 0, 255).astype(np.uint8)

    # Combine RGB + Alpha
    return np.dstack([img_array[:, :, :3], alpha])


def convert_spritesheet(
    input_path: Path,
    output_path: Path,
    source_cols: int = None,
    source_rows: int = None,
    target_cols: int = None,
    target_frame_width: int = None,
    target_frame_height: int = None,
    key_rgb: tuple = (255, 0, 255),
    tolerance: int = 40,
    verbose: bool = False
) -> dict:
    """
    Convert spritesheet with optional resampling and chroma key removal.

    Returns dict with conversion info.
    """
    img = Image.open(input_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')

    orig_width, orig_height = img.size

    if verbose:
        print(f"Input: {input_path.name}")
        print(f"  Size: {orig_width}x{orig_height}")

    # Auto-detect grid if not specified
    if source_cols is None:
        # Common formats: 8x4, 4x4, 3x4
        if orig_width / orig_height > 1.5:
            source_cols = 8
        else:
            source_cols = 4

    if source_rows is None:
        source_rows = 4  # Standard 4 directions

    frame_width = orig_width // source_cols
    frame_height = orig_height // source_rows

    if verbose:
        print(f"  Detected grid: {source_cols}x{source_rows}")
        print(f"  Frame size: {frame_width}x{frame_height}")

    # Determine target configuration
    if target_cols is None:
        target_cols = source_cols

    target_rows = source_rows  # Keep same row count (directions)

    # Calculate sampling
    sample_step = source_cols // target_cols if target_cols < source_cols else 1

    # Determine target frame size
    if target_frame_width and target_frame_height:
        out_frame_w = target_frame_width
        out_frame_h = target_frame_height
        need_resize = True
    else:
        out_frame_w = frame_width
        out_frame_h = frame_height
        need_resize = False

    # Create output image
    out_width = target_cols * out_frame_w
    out_height = target_rows * out_frame_h

    if verbose:
        print(f"  Target grid: {target_cols}x{target_rows}")
        print(f"  Output size: {out_width}x{out_height}")
        if sample_step > 1:
            print(f"  Sampling: every {sample_step} frames")

    # Process each frame
    img_array = np.array(img)
    output_frames = []

    for row in range(source_rows):
        row_frames = []
        for col in range(0, source_cols, sample_step):
            if len(row_frames) >= target_cols:
                break

            # Extract frame
            x = col * frame_width
            y = row * frame_height
            frame = img_array[y:y+frame_height, x:x+frame_width]

            # Resize if needed (use nearest neighbor for pixel art)
            if need_resize:
                frame_img = Image.fromarray(frame)
                frame_img = frame_img.resize((out_frame_w, out_frame_h), Image.NEAREST)
                frame = np.array(frame_img)

            row_frames.append(frame)

        output_frames.append(row_frames)

    # Assemble output image
    output_array = np.zeros((out_height, out_width, 3), dtype=np.uint8)

    for row_idx, row_frames in enumerate(output_frames):
        for col_idx, frame in enumerate(row_frames):
            x = col_idx * out_frame_w
            y = row_idx * out_frame_h
            output_array[y:y+out_frame_h, x:x+out_frame_w] = frame[:, :, :3]

    # Remove chroma key
    rgba_array = remove_chroma_key(output_array, key_rgb, tolerance)

    # Save
    result = Image.fromarray(rgba_array, mode='RGBA')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, 'PNG', optimize=False)

    info = {
        'input_size': (orig_width, orig_height),
        'output_size': (out_width, out_height),
        'source_grid': (source_cols, source_rows),
        'target_grid': (target_cols, target_rows),
        'frame_size': (out_frame_w, out_frame_h),
        'output_path': str(output_path)
    }

    if verbose:
        print(f"  Saved: {output_path}")

    return info


def main():
    parser = argparse.ArgumentParser(
        description='Convert spritesheets with chroma key removal.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Auto-convert (detects 8x4 or 4x4)
    python convert_spritesheet.py --in sprite.jpg --out sprite.png

    # Convert 8x4 to 4x4 (sample every 2nd frame)
    python convert_spritesheet.py --in sprite.jpg --out sprite.png --target-cols 4

    # Keep 8x4 as-is with chroma key removal
    python convert_spritesheet.py --in sprite.jpg --out sprite.png --cols 8

    # Resize frames to 48x64
    python convert_spritesheet.py --in sprite.jpg --out sprite.png --frame-w 48 --frame-h 64

    # Batch convert directory
    python convert_spritesheet.py --in ./raw --out ./sprites
        """
    )

    parser.add_argument('--in', '-i', dest='input', required=True,
                        help='Input file or directory')
    parser.add_argument('--out', '-o', dest='output', required=True,
                        help='Output file or directory')
    parser.add_argument('--cols', type=int, default=None,
                        help='Source columns (auto-detect if not set)')
    parser.add_argument('--rows', type=int, default=4,
                        help='Source rows (default: 4 directions)')
    parser.add_argument('--target-cols', type=int, default=None,
                        help='Target columns (resample if different)')
    parser.add_argument('--frame-w', type=int, default=None,
                        help='Target frame width (resize if set)')
    parser.add_argument('--frame-h', type=int, default=None,
                        help='Target frame height (resize if set)')
    parser.add_argument('--key', '-k', default='#FF00FF',
                        help='Chroma key color (default: #FF00FF)')
    parser.add_argument('--tol', '-t', type=int, default=40,
                        help='Color tolerance (default: 40)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Verbose output')

    args = parser.parse_args()

    try:
        key_rgb = hex_to_rgb(args.key)
    except ValueError:
        print(f"Error: Invalid hex color '{args.key}'")
        sys.exit(1)

    input_path = Path(args.input)
    output_path = Path(args.output)

    print("Spritesheet Converter")
    print(f"  Chroma key: {args.key}")
    print()

    if input_path.is_file():
        # Single file
        if output_path.suffix.lower() != '.png':
            output_path = output_path.with_suffix('.png')

        info = convert_spritesheet(
            input_path, output_path,
            source_cols=args.cols,
            source_rows=args.rows,
            target_cols=args.target_cols,
            target_frame_width=args.frame_w,
            target_frame_height=args.frame_h,
            key_rgb=key_rgb,
            tolerance=args.tol,
            verbose=True
        )

        print(f"\nDone!")
        print(f"  Grid: {info['source_grid']} → {info['target_grid']}")
        print(f"  Frame: {info['frame_size'][0]}x{info['frame_size'][1]}")
        print(f"  Output: {info['output_path']}")

    elif input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)

        extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        files = [f for f in input_path.iterdir()
                 if f.is_file() and f.suffix.lower() in extensions]

        if not files:
            print(f"No image files in {input_path}")
            sys.exit(1)

        print(f"Processing {len(files)} files...")

        for f in sorted(files):
            out_file = output_path / (f.stem + '.png')
            try:
                convert_spritesheet(
                    f, out_file,
                    source_cols=args.cols,
                    source_rows=args.rows,
                    target_cols=args.target_cols,
                    target_frame_width=args.frame_w,
                    target_frame_height=args.frame_h,
                    key_rgb=key_rgb,
                    tolerance=args.tol,
                    verbose=args.verbose
                )
                print(f"  ✓ {f.name}")
            except Exception as e:
                print(f"  ✗ {f.name}: {e}")

        print(f"\nDone! Output: {output_path}")
    else:
        print(f"Error: Path not found: {input_path}")
        sys.exit(1)


if __name__ == '__main__':
    main()
