def process_login(username: str, password: str) -> bool:
    return len(username) > 0 and len(password) > 0


def validate_token(token: str) -> bool:
    return token.startswith("Bearer ")


class AuthError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.name = "AuthError"

    def to_dict(self) -> dict:
        return {"error": str(self)}


# internal — should NOT be extracted
def _hash_password(password: str) -> str:
    return password
