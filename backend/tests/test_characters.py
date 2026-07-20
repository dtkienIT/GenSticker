def test_character_crud_and_delete_cascade(client):
    # 1. Create character
    res = client.post(
        "/api/v1/characters",
        json={"display_name": "My Hero Character"},
    )
    assert res.status_code == 200
    char_id = res.json()["id"]

    # 2. List characters
    res_list = client.get("/api/v1/characters")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 3. Delete character
    res_del = client.delete(f"/api/v1/characters/{char_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "deleted"

    # 4. List again -> empty
    res_list_after = client.get("/api/v1/characters")
    assert len(res_list_after.json()) == 0
