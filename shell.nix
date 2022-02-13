{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.bintools-unwrapped
    pkgs.tree-sitter
    pkgs.nodejs
  ];
}
