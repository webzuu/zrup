import blessed from "blessed";

async function main(
    resolve: (code: unknown) => unknown,
    reject: (err: unknown) => unknown
)
{
    const screen = blessed.screen({
        smartCSR: true
    });

    screen.title = "ZRUP UI";

    const box = blessed.box({
       top: 'top',
       left: 'left',
       width: '100%',
       height: '100%',
       content: 'Hello {bold}world{/bold}!',
       tags: true,
       border: {
           type: 'line'
       },
        style: {
            fg: 'white',
            bg: 'black',
            border: {
                fg: '#f0f0f0'
            }
        }
    });
    screen.append(box);
    box.on('click', _ => {
        box.setContent('I was clicked!');
        screen.render();
    })

    screen.key(['escape', 'q', 'C-c'], () => {
        resolve(0);
    })
    box.focus();
    screen.render();
}

(new Promise(async (resolve, reject) => { await main(resolve, reject); }))
    .then((code: unknown) => process.exit(code as number));

