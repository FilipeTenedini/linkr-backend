import db from '../database/connection.js';

export function getTrending() {
  const query = db.query(`
    SELECT tag, COUNT(*)::INTEGER AS amount
    FROM tags
    GROUP BY tag
    ORDER BY amount DESC;
  ;`);
  return query;
}

export function hashtagById(userId, hashtag) {
  const query = db.query(`
    SELECT DISTINCT t.post_id, p.url, p.description, p.created_at, u.name, u.photo, u.id AS user_id,
      EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = p.id
        AND likes.user_id = $1
      ) AS "userLikedPost",
      (
        SELECT ARRAY_AGG(u2.name)
        FROM likes l
        JOIN users u2 ON u2.id = l.user_id
        WHERE l.post_id = p.id
        LIMIT 2
      ) AS "likedUsers",
      (
        SELECT COUNT(*)
        FROM likes
        WHERE likes.post_id = p.id
      ) AS "likeCount"
    FROM tags t
    JOIN posts p ON p.id = t.post_id
    JOIN users u ON u.id = p.user_id
    WHERE t.tag = $2
    ORDER BY t.post_id DESC;
`, [userId, hashtag]);

  return query;
}

// SELECT DISTINCT t.post_id, p.url, p.description, p.created_at, u.name, u.photo, u.id AS user_id
// FROM tags t
// JOIN posts p ON p.id = t.post_id
// JOIN users u ON u.id = p.user_id
// WHERE t.tag = $1
// ORDER BY t.post_id DESC
