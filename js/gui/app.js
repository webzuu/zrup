#!/usr/bin/env node
import { QLabel, QMainWindow } from "@nodegui/nodegui";
const win = new QMainWindow();
const label = new QLabel(win);
label.setText("Hello world");
label.setInlineStyle("color: green; background-color: white");
win.show();
global.win = win;
//# sourceMappingURL=app.js.map