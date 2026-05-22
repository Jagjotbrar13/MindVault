from fastapi import Request


def services(request: Request) -> dict:
    return request.app.state.services
