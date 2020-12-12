"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jimp_1 = __importDefault(require("jimp"));
const fs = require('fs');
const imageTitle = 'myTest.png';
const binaryConvertionTreshhold = 70;
const lookingFor = 'white';
const pixelToBinary = (pixel) => {
    const whitePixel = { color: { r: 0, b: 0, g: 0 }, a: 255, type: 'black' };
    const blackPixel = { color: { r: 255, b: 255, g: 255 }, a: 255, type: 'white' };
    const { color: { r, g, b }, x, y } = pixel;
    const average = (r + g + b) / 3;
    if (average < binaryConvertionTreshhold)
        return Object.assign({}, whitePixel, { x, y });
    return Object.assign({}, blackPixel, { x, y });
};
const jimpToPixelArray = (image, width, height) => {
    const rows = [];
    for (let y = 0; y < height; y++) {
        rows.push([]);
        for (let x = 0; x < width; x++) {
            const pixel = jimp_1.default.intToRGBA(image.getPixelColor(x, y));
            const { r, g, b, a } = pixel;
            rows[y].push({
                color: {
                    r,
                    g,
                    b,
                },
                a,
                x,
                y,
            });
        }
    }
    return rows;
};
const pixelArrayToBinary = (pixelsInput) => {
    const pixelsOutput = [];
    for (let y = 0; y < pixelsInput.length; y++) {
        pixelsOutput.push([]);
        for (let x = 0; x < pixelsInput[y].length; x++) {
            // @ts-ignore
            pixelsOutput[y].push(pixelToBinary(pixelsInput[y][x]));
        }
    }
    return pixelsOutput;
};
let rValue = 255;
const getObject = (input, pixel, accamulator, color) => {
    const { x, y } = pixel;
    if (input[y][x].marked || input[y][x].type === 'black')
        return accamulator;
    accamulator.push(pixel);
    input[y][x].marked = true;
    input[y][x].color.r = color.r;
    input[y][x].color.g = color.g;
    input[y][x].color.b = color.b;
    const u = getObject(input, input[y][x - 1], accamulator, color);
    const d = getObject(input, input[y][x + 1], accamulator, color);
    const l = getObject(input, input[y - 1][x], accamulator, color);
    const r = getObject(input, input[y + 1][x], accamulator, color);
};
const getObjectsOnImage = (input) => {
    const objects = [];
    let currentPixel;
    for (let y = 5; y < input.length - 5; y++) {
        for (let x = 5; x < input[y].length - 5; x++) {
            let currentObject = [];
            getObject(input, input[y][x], currentObject, {
                r: (x * y) % 255,
                g: (x + y) % 255,
                b: y % 255,
            });
            const tmpObject = {
                pixels: currentObject
            };
            if (currentObject.length > 0)
                objects.push(tmpObject);
            currentObject = [];
        }
    }
    return objects.map(object => (Object.assign({}, object, { countour: getCountour(object.pixels), angles: getAngles(object.pixels, input) })));
};
const getBoundary = (object) => {
    const { MAX_SAFE_INTEGER } = Number;
    let u = MAX_SAFE_INTEGER;
    let d = 0;
    let l = MAX_SAFE_INTEGER;
    let r = 0;
    object.forEach(pixel => {
        if (pixel.x > r)
            r = pixel.x;
        if (pixel.x < l)
            l = pixel.x;
        if (pixel.y < u)
            u = pixel.y;
        if (pixel.y > d)
            d = pixel.y;
    });
    return { u, d, l, r };
};
const getCountour = (object) => {
    const boundary = getBoundary(object);
    return boundary;
};
const drawNeighpour = (neighbours, input) => {
    neighbours.forEach(neighbour => {
        input[neighbour.y][neighbour.x].color = {
            r: 255,
            g: 0,
            b: 0,
        };
    });
};
const getAngles = (object, input) => {
    let countAngles = 0;
    object.forEach(pixel => {
        const neighbours = [
            input[pixel.y - 1][pixel.x + 1],
            input[pixel.y - 1][pixel.x - 1],
            input[pixel.y - 1][pixel.x],
            input[pixel.y + 1][pixel.x + 1],
            input[pixel.y + 1][pixel.x - 1],
            input[pixel.y + 1][pixel.x],
            input[pixel.y][pixel.x + 1],
            input[pixel.y][pixel.x - 1],
        ].filter(neighbour => neighbour.color.r === 0);
        if (neighbours.length > 4) {
            drawNeighpour(neighbours, input);
            countAngles++;
        }
    });
    return countAngles;
};
const drawCountour = (countour, input) => {
    const { d, l, r, u, } = countour;
    const red = { r: 255, g: 0, b: 0 };
    const dr = {
        x: r,
        y: d,
    };
    const ul = {
        x: l,
        y: u,
    };
    for (let x = ul.x; x !== dr.x; x++) {
        input[ul.y][x].color = red;
        input[dr.y][x].color = red;
    }
    for (let y = dr.y; y !== ul.y; y--) {
        input[y][dr.x].color = red;
        input[y][ul.x].color = red;
    }
};
const display = (object) => {
    console.log(`Object with length ${object.pixels.length} has ${object.angles} angles`);
};
const colorObject = (object, color, input) => {
    object.pixels.forEach(pixel => {
        input[pixel.y][pixel.x].color = color;
    });
};
const colorSameObjects = (objects, input) => {
    let currentAngles = objects[0].angles;
    let color = {
        r: Math.random() * 255,
        g: Math.random() * 255,
        b: Math.random() * 255,
    };
    objects.forEach(object => {
        if (currentAngles === object.angles) {
            console.log(`Color object ${object.angles} with ${color.r}`);
            colorObject(object, color, input);
        }
        else {
            color = {
                r: Math.random() * 255,
                g: Math.random() * 255,
                b: Math.random() * 255,
            };
            currentAngles = object.angles;
            console.log(`Color object ${object.angles} with ${color.r}`);
            colorObject(object, color, input);
        }
    });
};
const saveImage = (newImage) => {
    new jimp_1.default(newImage[0].length, newImage.length, (err, image) => {
        if (err)
            throw err;
        newImage.forEach((rowPixels, y) => {
            rowPixels.forEach((pixel, x) => {
                const { color: { r, g, b } } = pixel;
                const color = jimp_1.default.rgbaToInt(r, g, b, 255);
                image.setPixelColor(color, x, y);
            });
        });
        image.write('OUTPUT_IMAGE.png', (err) => {
            if (err) {
                throw err;
            }
        });
    });
};
const startApp = () => __awaiter(this, void 0, void 0, function* () {
    const image = (yield jimp_1.default.read(`./${imageTitle}`))
        .quality(100)
        .greyscale();
    const bitmap = image.bitmap;
    const { height, width } = bitmap;
    const pixelArray = jimpToPixelArray(image, width, height);
    const newImage = pixelArrayToBinary(pixelArray);
    const objects = getObjectsOnImage(newImage).sort((a, b) => a.angles - b.angles);
    colorSameObjects(objects, newImage);
    objects.forEach(display);
    saveImage(newImage);
});
startApp();
//# sourceMappingURL=index.js.map