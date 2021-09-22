class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
};

class Rectangle {
    constructor(width, height, x, y, color) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.color = color;
    }
};

rect = new Rectangle(150, 150, 120, 10, new Color(0, 0, 255, 1.0));
context = null;

rotationSpeed = 100;
circleRadius = 100;
canvasWidth = null;
canvasHeight = null;

function drawRect(rect) {
    var rcolor = rect.color;

    if (context) {
//        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = 'rgba(0,0,0,1.0)';
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        context.fillStyle = 'rgba(' + rcolor.r + ',' + rcolor.g + ',' + rcolor.b + ',' + rcolor.a + ')';
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
}

function moveRect() {
    rect.x = Math.cos(Date.now() / 10000 * rotationSpeed) * circleRadius + canvasWidth / 2  - rect.width / 2;
    rect.y = Math.sin(Date.now() / 10000 * rotationSpeed) * circleRadius + canvasHeight / 2 - rect.height / 2;
    drawRect(rect);
}

function main() {
    var canvas = document.getElementById("example");
    if (!canvas) {
        console.log("Canvas element missing");
        return false;
    }

    context = canvas.getContext("2d");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    drawRect(rect);

    setInterval(moveRect, 10);
}
