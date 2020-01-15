Not all features are implemented.  As always, feel free to PR or fork and add on or rip up.

Examples:

    $ bitfiles status TX://<txid>
    $ bitfiles status D://<addr>[/optional/path]
    $ bitfiles status BCAT://<txid>
    $ bitfiles status C://<txid>

    $ bitfiles stream BCAT://<txid>
    $ bitfiles download D://<addr>[/optional/pth]

    $ bitfiles bitdb '{ bitdb json query }'

    $ git init
    $ D-to-git-fast-import <addr> | git fast-import

