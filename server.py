#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目全生命周期管理系统 - Python HTTP 服务器
用于在 Windows 7 环境下提供本地 Web 服务
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import socket
import threading
import argparse
from urllib.parse import quote

PORT = 8080
HOST = 'localhost'
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        sys.stdout.write(f"[HTTP] {self.address_string()} - {format % args}\n")
        sys.stdout.flush()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def find_free_port(start_port=8080):
    port = start_port
    while port < start_port + 100:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((HOST, port))
                return port
        except OSError:
            port += 1
    return None

def get_chrome_path():
    import winreg

    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]

    for path in chrome_paths:
        if os.path.exists(path):
            return path

    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")
        path, _ = winreg.QueryValueEx(key, "")
        winreg.CloseKey(key)
        if os.path.exists(path):
            return path
    except:
        pass

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")
        path, _ = winreg.QueryValueEx(key, "")
        winreg.CloseKey(key)
        if os.path.exists(path):
            return path
    except:
        pass

    return None

def main():
    global PORT, HOST, DIRECTORY

    parser = argparse.ArgumentParser(description='项目全生命周期管理系统 - HTTP 服务器')
    parser.add_argument('--port', type=int, default=8080, help='服务器端口 (默认: 8080)')
    parser.add_argument('--host', type=str, default='localhost', help='服务器主机 (默认: localhost)')
    parser.add_argument('--dir', type=str, default=None, help='服务目录 (默认: 当前目录)')
    parser.add_argument('--no-browser', action='store_true', help='不自动打开浏览器')
    parser.add_argument('--chrome-path', type=str, default=None, help='指定 Chrome 浏览器路径')
    args = parser.parse_args()

    PORT = args.port
    HOST = args.host
    if args.dir:
        DIRECTORY = args.dir

    os.chdir(DIRECTORY)

    print("=" * 60)
    print("项目全生命周期管理系统 - Python HTTP 服务器")
    print("=" * 60)
    print(f"服务目录: {DIRECTORY}")
    print(f"服务地址: http://{HOST}:{PORT}/")
    print("=" * 60)
    print()

    port = find_free_port(PORT)
    if port is None:
        print(f"[错误] 无法找到可用端口 (从 {PORT} 开始)")
        sys.exit(1)

    if port != PORT:
        print(f"[警告] 端口 {PORT} 已被占用，使用端口 {port}")

    chrome_path = args.chrome_path or get_chrome_path()

    Handler = QuietHTTPRequestHandler

    with socketserver.TCPServer((HOST, port), Handler) as httpd:
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()

        print(f"[启动] 服务器已启动，正在监听 {HOST}:{port}")
        print()

        if not args.nobrowser:
            if chrome_path:
                print(f"[启动] 正在打开 Chrome 浏览器...")
                print(f"[信息] Chrome 路径: {chrome_path}")
                chrome_url = f"http://{HOST}:{port}/"
                webbrowser.register('chrome', None, webbrowser.BackgroundBrowser(chrome_path))
                webbrowser.get('chrome').open(chrome_url)
            else:
                print("[警告] 未找到 Chrome 浏览器，请手动打开浏览器访问:")
                print(f"       http://{HOST}:{port}/")
                print()

        print("-" * 60)
        print("按 Ctrl+C 停止服务器")
        print("-" * 60)

        try:
            while True:
                pass
        except KeyboardInterrupt:
            print()
            print("[停止] 服务器正在停止...")
            httpd.shutdown()
            sys.exit(0)

if __name__ == "__main__":
    main()
