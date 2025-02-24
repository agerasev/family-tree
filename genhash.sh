#!/bin/sh

hexdump -vn4 -e '1/4 "%08x" 1 "\n"' /dev/urandom
