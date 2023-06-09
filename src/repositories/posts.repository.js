import db from '../database/connection.js';
import postQueryBuilder from '../helpers/postQueryBuilder.js';
import tagsRepository from './tags.repository.js';

async function createPost(values) {
  const query = postQueryBuilder(values);
  const { rows } = await db.query(query, values);
  return rows[0];
}

async function listUserPosts(userId, id, offset = 0) {
  const { rows } = await db.query(`
  SELECT subquery.*,
    (SELECT COUNT(*) FROM reposts WHERE post_id = subquery.post_id) AS "repostCount",
    COALESCE(c.comment_count, 0) AS "commentCount"
  FROM (
    SELECT p.*, p.id AS post_id,
      u.photo AS photo,
      u.name AS name,
      NULL AS repost_user_id,
      NULL AS repost_user_name,
      NULL AS repost_created_at,
      EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = p.id
        AND likes.user_id = $1
      ) AS "userLikedPost",
      COUNT(DISTINCT l.user_id) AS "likeCount",
      (
        SELECT ARRAY_AGG(u2.name)
        FROM likes l
        JOIN users u2 ON u2.id = l.user_id
        WHERE l.post_id = p.id
        LIMIT 2
      ) AS "likedUsers"
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN reposts r ON r.post_id = p.id
    LEFT JOIN users ru ON ru.id = r.user_id
    WHERE (p.user_id = $2)
    GROUP BY p.id, u.photo, u.name, r.user_id, ru.name

    UNION

    SELECT p.*, p.id AS post_id,
      u.photo AS photo,
      u.name AS name,
      r.user_id AS repost_user_id,
      ru.name AS repost_user_name,
      r.created_at AS repost_created_at,
      EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = p.id
        AND likes.user_id = $1
      ) AS "userLikedPost",
      COUNT(DISTINCT l.user_id) AS "likeCount",
      (
        SELECT ARRAY_AGG(u2.name)
        FROM likes l
        JOIN users u2 ON u2.id = l.user_id
        WHERE l.post_id = p.id
        LIMIT 2
      ) AS "likedUsers"
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN reposts r ON r.post_id = p.id
    LEFT JOIN users ru ON ru.id = r.user_id
    WHERE (p.user_id = $2 OR (r.user_id = $2 AND r.user_id IS NOT NULL))
      AND (r.user_id = $2 OR r.user_id IS NULL)
    GROUP BY p.id, u.photo, u.name, r.user_id, ru.name, r.created_at, p.created_at
  ) AS subquery
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count
    FROM comments
    GROUP BY post_id
  ) AS c ON c.post_id = subquery.post_id
  ORDER BY GREATEST(repost_created_at, created_at) DESC, post_id DESC

  LIMIT 10
  OFFSET $3;
  `, [userId, id, offset]);

  return rows;
}

async function listPosts(userId, offset = 0) {
  const { rows } = await db.query(`
  SELECT subquery.*,
    (COUNT(*) OVER (PARTITION BY subquery.post_id) - 1) AS "repostCount",
    COALESCE(c.comment_count, 0) AS "commentCount"
  FROM (
    SELECT p.*, p.id AS post_id,
      u.photo AS photo,
      u.name AS name,
      NULL AS repost_user_id,
      NULL AS repost_user_name,
      NULL AS repost_created_at,
      EXISTS (
        SELECT 1
        FROM follows fol
        WHERE fol.followed_id = r.user_id
        AND fol.user_id = $1
      ) AS "followingRepostUser",
      EXISTS (
        SELECT 1
        FROM follows fo
        WHERE fo.followed_id = p.user_id
        AND fo.user_id = $1
      ) AS "followingUser",
      EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = p.id
        AND likes.user_id = $1
      ) AS "userLikedPost",
      COUNT(DISTINCT l.user_id) AS "likeCount",
      (
        SELECT ARRAY_AGG(u2.name)
        FROM likes l
        JOIN users u2 ON u2.id = l.user_id
        WHERE l.post_id = p.id
        LIMIT 2
      ) AS "likedUsers"
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN reposts r ON r.post_id = p.id
    LEFT JOIN users ru ON ru.id = r.user_id
    GROUP BY p.id, u.photo, u.name, r.user_id, ru.name

    UNION

    SELECT p.*, p.id AS post_id,
      u.photo AS photo,
      u.name AS name,
      r.user_id AS repost_user_id,
      ru.name AS repost_user_name,
      r.created_at AS repost_created_at,
      EXISTS (
        SELECT 1
        FROM follows fol
        WHERE fol.followed_id = r.user_id
        AND fol.user_id = $1
      ) AS "followingRepostUser",
      EXISTS (
        SELECT 1
        FROM follows fo
        WHERE fo.followed_id = p.user_id
        AND fo.user_id = $1
      ) AS "followingUser",
      EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = p.id
        AND likes.user_id = $1
      ) AS "userLikedPost",
      COUNT(DISTINCT l.user_id) AS "likeCount",
      (
        SELECT ARRAY_AGG(u2.name)
        FROM likes l
        JOIN users u2 ON u2.id = l.user_id
        WHERE l.post_id = p.id
        LIMIT 2
      ) AS "likedUsers"
    FROM posts p
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN reposts r ON r.post_id = p.id
    LEFT JOIN users ru ON ru.id = r.user_id
    GROUP BY p.id, u.photo, u.name, r.user_id, ru.name, r.created_at, p.created_at
  ) AS subquery
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count
    FROM comments
    GROUP BY post_id
  ) AS c ON c.post_id = subquery.post_id
  WHERE (subquery."followingUser" = true AND repost_user_id IS NULL) 
    OR (subquery."followingRepostUser" = true AND repost_user_id IS NOT NULL)
    OR (repost_user_id = $1 AND (repost_user_id IS NULL OR repost_user_id = $1))
    OR EXISTS (
      SELECT 1
      FROM posts
      WHERE user_id = $1
      AND id = subquery.post_id
      AND repost_user_id IS NULL
  )
  ORDER BY GREATEST(repost_created_at, created_at, subquery.created_at) DESC, subquery.post_id DESC

  LIMIT 10
  OFFSET $2;
  `, [userId, offset]);
  return rows;
}

async function findPostById(id) {
  const post = await db.query(`
    SELECT * FROM posts WHERE id = $1
  `, [id]);
  return post.rows[0];
}

async function deleteOne(postId) {
  try {
    await db.query('BEGIN');
    await db.query('DELETE FROM likes WHERE likes.post_id = $1', [postId]);
    await db.query('DELETE FROM tags WHERE tags.post_id = $1', [postId]);
    await db.query('DELETE FROM reposts WHERE reposts.post_id = $1', [postId]);
    await db.query('DELETE FROM "comments" WHERE "comments".post_id = $1', [postId]);
    await db.query('DELETE FROM posts WHERE posts.id = $1', [postId]);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error:', error);
  }
}
async function update(description, postId) {
  const regex = /#\w{1,}/g;
  const hashtagList = description && description.match(regex);

  await db.query(`
    DELETE FROM tags WHERE tags.post_id = $1;
  `, [postId]);

  if (hashtagList) {
    await tagsRepository.insertTag(hashtagList, postId);
  }

  await db.query(`
    UPDATE posts
    SET description = $1
    WHERE id = $2;
  `, [description, postId]);
}
export default {
  createPost,
  listUserPosts,
  listPosts,
  findPostById,
  deleteOne,
  update,
};
