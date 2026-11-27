"""Bake Dam's Asia carry actions to the 4 x 8 cells consumed by workers.js."""
from io import BytesIO
from math import cos, pi, sin
from argparse import ArgumentParser
from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageOps

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
FOLDERS = {"asia": "Asia", "west": "West", "cyberhell": "CyberHell"}
SIZE = 320
FRAMES = 8
DIRECTIONS = ("side", "side-left", "down", "up")
RESAMPLE = Image.Resampling.LANCZOS


def cut(image):
    box = image.getchannel("A").point(lambda a: 255 if a >= 48 else 0).getbbox()
    return image.crop(box)


def split(folder, name):
    image = Image.open(folder / name).convert("RGBA")
    return [cut(image.crop((image.width*i//3, 0, image.width*(i+1)//3, image.height)))
            for i in range(3)]


def part(image, maximum):
    result = image.copy()
    result.thumbnail(maximum, RESAMPLE)
    return result


def at(canvas, image, x, y):
    canvas.alpha_composite(image, (round(x - image.width/2), round(y)))


def step(phase):
    # First half planted and the second lifted. Opposite feet swap every half cycle.
    path = sin(phase * 2 * pi)
    lift = max(0, -cos(phase * 2 * pi))
    return path, lift


def draw_leg(canvas, leg, direction, x, leg_index, phase):
    path, lift = step(phase + .5*leg_index)
    far = leg_index == 0
    if direction < 2:
        extent = 18
        flip = direction == 1
        leg_part = part(leg, (54, 72 if far else 77))
        tilt = -path * 8
    else:
        extent = 4
        flip = (leg_index == 0) != (direction == 3)
        leg_part = part(leg, (45, 72 if far else 77))
        tilt = -path * 4
    if flip:
        leg_part = ImageOps.mirror(leg_part)
        tilt = -tilt
    leg_part = cut(leg_part.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True))
    # Each frame keeps at least one sole at y=319.
    sole = SIZE - round(lift * 11)
    at(canvas, leg_part, x + path*extent, sole-leg_part.height)


def frame(bodies, parts, direction, cycle, cargo, tray_level):
    leg, sack, tray = parts
    cell = Image.new("RGBA", (SIZE, SIZE))
    spread = 26 if direction < 2 else 34
    draw_leg(cell, leg, direction, SIZE/2-spread, 0, cycle)
    draw_leg(cell, leg, direction, SIZE/2+spread, 1, cycle)
    body = bodies[direction]
    step_bob = round((.5-.5*cos(cycle * 4*pi))*4)
    facing = -1 if direction == 1 else 1
    body_x = 160 if direction >= 2 else 160 + 4*facing
    body_y = 270-body.height+step_bob
    prop_y = body_y + round(body.height*.57)
    if cargo == "walk":
        bag = part(sack, (99,105))
        if direction == 1:
            bag = ImageOps.mirror(bag)
        if direction != 3:
            at(cell, bag, body_x-(body.width*.40)*facing, prop_y-49)
    at(cell, body, body_x, body_y)
    if cargo == "rice":
        platter = part(tray, (94 if direction < 2 else 105,53))
        if direction == 1:
            platter = ImageOps.mirror(platter)
        if direction == 3:
            # Only the far tip of the tray projects beyond the body in rear view.
            platter = platter.crop((0, round(platter.height*.57), platter.width, platter.height))
            for side_x in (body_x-body.width*.39, body_x+body.width*.39):
                endpoint = platter.crop((0, 0, round(platter.width*.17), platter.height))
                if side_x > body_x:
                    endpoint = ImageOps.mirror(endpoint)
                at(cell, endpoint, side_x, prop_y+19)
        else:
            at(cell, platter, body_x+(26*facing if direction < 2 else 0), body_y+round(body.height*tray_level)-4)
    elif direction == 3:
        at(cell, part(sack,(100,105)), body_x-16, prop_y-51)
    box = cell.getchannel("A").point(lambda a: 255 if a >= 64 else 0).getbbox()
    assert box[0] > 10 and box[2] < 310 and box[3] >= SIZE-1, (direction, cycle, box)
    return cell


def write_webp(image, file, limit=350_000):
    for quality in (89,86,83,80,77,74,71,68,65):
        stream = BytesIO()
        image.save(stream,"WEBP",method=5,quality=quality,exact=True)
        if stream.tell() <= limit:
            file.write_bytes(stream.getvalue())
            return
    raise ValueError(f"over {limit} bytes: {file}")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("zone", choices=FOLDERS)
    zone = parser.parse_args().zone
    game = ROOT / "img" / FOLDERS[zone]
    sources = OUT / (zone + "-rig")
    front, side, back = split(sources, "body.webp")
    max_width = 175 if zone == "asia" else 201
    bodies = [part(side, (max_width,246)), part(ImageOps.mirror(side), (max_width,246)),
              part(front, (max_width+2,246)), part(back, (max_width+2,246))]
    parts = split(sources, "parts.webp")
    tray_level = {"asia": .57, "west": .685, "cyberhell": .72}[zone]
    all_cells = {}
    for cargo in ("walk","rice"):
        stem = f"crew-dam-{zone}-carry-{cargo}-v1"
        sheet = Image.new("RGBA", (SIZE*FRAMES,SIZE*len(DIRECTIONS)))
        for row in range(len(DIRECTIONS)):
            for col in range(FRAMES):
                cell = frame(bodies,parts,row,col/FRAMES,cargo,tray_level)
                sheet.alpha_composite(cell,(col*SIZE,row*SIZE))
                all_cells[cargo,row,col] = cell
        write_webp(sheet,game / (stem + ".webp"))
        template = json.loads((ROOT / "img" / ("crew-dam-carry-" + cargo + "-v1.json")).read_text())
        template["image"] = stem+".webp"
        template["source"] = f"FB3-C6 {zone}: pose parts drawn in ImageGen and baked by docs/art-reviews/2026-11-26-fb3-C6/bake.py"
        for direction in template["rows"]:
            direction["dx"] = 0
            direction["scale"] = 1
        (game / (stem + ".json")).write_text(json.dumps(template, indent=1)+"\n")
    supervisor = cut(Image.open(sources / "supervisor.webp").convert("RGBA"))
    supervisor.thumbnail((444,470),RESAMPLE)
    static = Image.new("RGBA",(512,512))
    at(static,supervisor,256,501-supervisor.height)
    write_webp(static,game / f"crew-dam-{zone}-supervise-v1.webp",300_000)
    gif = []
    for i in range(FRAMES):
        sample = Image.new("RGB", (660,382),"#272539")
        draw = ImageDraw.Draw(sample)
        draw.text((18,16),f"AVEGEE / C6 / {zone.upper()}",fill="#fae0a6")
        draw.text((18,52),"Carry goods",fill="#faf3f4")
        draw.text((18,215),"Serve rice",fill="#faf3f4")
        for row, label in enumerate(DIRECTIONS):
            x = 4+row*165
            draw.text((x+40,359),label,fill="#d4cae4")
            for cargo,y in [("walk",58),("rice",220)]:
                pose = all_cells[cargo,row,i].resize((140,140),RESAMPLE)
                sample.paste(pose,(x+12,y),pose)
        gif.append(sample)
    gif[0].save(OUT/f"{zone}-walk.gif",save_all=True,append_images=gif[1:],duration=125,loop=0,optimize=True)

if __name__ == "__main__":
    main()
