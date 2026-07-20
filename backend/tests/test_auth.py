def test_me_default_user(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["external_id"] == "local-dev-user"


def test_me_custom_user_header(client):
    response = client.get("/api/v1/me", headers={"X-Dev-User-Id": "test-user-99"})
    assert response.status_code == 200
    assert response.json()["external_id"] == "test-user-99"
